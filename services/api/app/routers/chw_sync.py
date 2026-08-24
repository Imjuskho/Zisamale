"""CHW Sync — batched offline-first data upload from Android devices.

Accepts batched visits, stock reports, and facility verifications from
450 CHWs working in rural Malawi with intermittent connectivity.
Handles conflict resolution, triggers alerts, and returns sync receipts.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.alerts.service import dispatch_alert, emit_alert
from app.deps import require_role, scoped_db
from app.models.facility import Facility
from app.models.visit import Visit
from app.sync.engine import (
    SyncEntity,
    apply_batch,
    coerce_datetime_field,
    coarsen_gps,
    require_override_reason,
    token_chw_id,
)

router = APIRouter(prefix="/api/v1/chw", tags=["chw-sync"])


# ── Request / Response schemas ─────────────────────────────────────


class VisitPayload(BaseModel):
    visit_id: str
    household_id: str
    visit_date: str
    visit_type: str = "routine"
    symptoms: list[str] = Field(default_factory=list)
    danger_signs: list[str] = Field(default_factory=list)
    measurements: dict[str, Any] = Field(default_factory=dict)
    ai_risk_score: float | None = None
    ai_recommendation: dict[str, Any] | None = None
    chw_override: bool = False
    chw_override_reason: str | None = None
    chw_notes: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None
    pregnancy_id: str | None = None
    child_id: str | None = None


class StockReport(BaseModel):
    facility_id: str
    commodity_name: str
    quantity_available: int
    quantity_required: int | None = None
    stockout_risk: str = "low"  # low | medium | high | critical
    reported_at: str | None = None


class FacilityVerification(BaseModel):
    facility_id: str
    latitude: float
    longitude: float
    accuracy_meters: float | None = None
    notes: str | None = None


class CHWBatchUpload(BaseModel):
    device_id: str
    chw_id: str
    chw_name: str
    district_id: str | None = None
    last_sync_timestamp: str | None = None
    visits: list[VisitPayload] = Field(default_factory=list)
    stock_reports: list[StockReport] = Field(default_factory=list)
    facility_verifications: list[FacilityVerification] = Field(default_factory=list)


class SyncResult(BaseModel):
    visits_processed: int = 0
    visits_created: int = 0
    visits_updated: int = 0
    stock_reports_processed: int = 0
    stock_alerts_triggered: int = 0
    verifications_processed: int = 0
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    alerts_triggered: list[dict[str, Any]] = Field(default_factory=list)
    sync_timestamp: str = ""


# ── Visit entity definition (policies live in app/sync/engine.py) ──

_VISIT_UPDATABLE = (
    "household_id",
    "visit_type",
    "symptoms",
    "danger_signs",
    "measurements",
    "ai_risk_score",
    "ai_recommendation",
    "chw_override",
    "chw_override_reason",
    "chw_notes",
    "gps_lat",
    "gps_lon",
)


def _require_visit_date(item: dict) -> None:
    coerce_datetime_field("visit_date")(item)


def _build_visit(item: dict) -> dict:
    return dict(
        household_id=item.get("household_id"),
        visit_date=item["visit_date"],
        pregnancy_id=item.get("pregnancy_id"),
        child_id=item.get("child_id"),
        visit_type=item.get("visit_type") or "routine",
        symptoms=item.get("symptoms") or [],
        danger_signs=item.get("danger_signs") or [],
        measurements=item.get("measurements") or {},
        ai_risk_score=item.get("ai_risk_score"),
        ai_recommendation=item.get("ai_recommendation"),
        chw_override=bool(item.get("chw_override")),
        chw_override_reason=item.get("chw_override_reason"),
        chw_notes=item.get("chw_notes"),
        gps_lat=item.get("gps_lat"),
        gps_lon=item.get("gps_lon"),
        sync_status="synced",
    )


def _update_visit(row: Visit, item: dict) -> None:
    for field_name in _VISIT_UPDATABLE:
        setattr(row, field_name, item.get(field_name))
    row.visit_date = item["visit_date"]


VISIT_ENTITY = SyncEntity(
    model=Visit,
    natural_key="visit_id",
    build=_build_visit,
    update=_update_visit,
    transforms=(
        coarsen_gps,
        _require_visit_date,
        require_override_reason,
    ),
)


# ── Endpoints ──────────────────────────────────────────────────────


@router.post("/sync", response_model=SyncResult)
async def sync_chw_data(
    upload: CHWBatchUpload,
    db: AsyncSession = Depends(scoped_db("chw", "supervisor")),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    """
    Accept batched data from CHW Android app.

    Handles:
    - Visit deduplication (same visit_id = update, not duplicate)
    - Stock report ingestion with critical-stockout alerting
    - Facility GPS verification with confidence scoring
    - Conflict detection (server has newer data)
    """
    result = SyncResult(sync_timestamp=datetime.utcnow().isoformat())
    owner = token_chw_id(user, upload.chw_id)

    # ── Process visits (engine: dedup, conflicts, ADR-005 transforms) ──
    batch = await apply_batch(
        db,
        VISIT_ENTITY,
        [visit.model_dump() for visit in upload.visits],
        owner_chw_id=owner,
    )
    result.visits_created = batch.created
    result.visits_updated = batch.updated
    result.visits_processed = batch.processed + batch.skipped
    result.conflicts.extend(batch.failures)

    # ── Process stock reports ──────────────────────────────────────
    pending_dispatch: list = []
    for report in upload.stock_reports:
        try:
            # Insert into stockout_history for audit trail
            from app.models.commodity import StockoutHistory
            history = StockoutHistory(
                stockout_id=str(uuid.uuid4()),
                facility_id=report.facility_id,
                commodity_id=None,
                stockout_date=datetime.utcnow().date(),
                duration_days=0 if report.stockout_risk != "critical" else None,
            )
            db.add(history)
            result.stock_reports_processed += 1

            # Trigger alert if critical stockout (idempotent per day+commodity)
            if report.stockout_risk == "critical":
                alert, created = await emit_alert(
                    db,
                    disease="stockout",
                    alert_level="red",
                    risk_score=0.9,
                    scale=1.0,
                    predicted_cases=0,
                    recommended_actions=[
                        f"CRITICAL: {report.commodity_name} stockout at facility",
                        f"Available: {report.quantity_available} units",
                        "Immediate resupply required",
                    ],
                    model_version=None,
                    idempotency_key=(
                        f"stockout:{report.facility_id}:{report.commodity_name}:"
                        f"{datetime.utcnow().date().isoformat()}"
                    ),
                )
                if created:
                    result.stock_alerts_triggered += 1
                    result.alerts_triggered.append({
                        "type": "stockout",
                        "commodity": report.commodity_name,
                        "facility_id": report.facility_id,
                        "severity": "critical",
                    })
                    pending_dispatch.append(alert)

        except Exception as exc:
            result.conflicts.append({
                "type": "stock_report",
                "id": f"{report.facility_id}:{report.commodity_name}",
                "reason": str(exc),
            })

    # ── Process facility verifications ─────────────────────────────
    for verification in upload.facility_verifications:
        try:
            fac_result = await db.execute(
                select(Facility).where(Facility.facility_id == verification.facility_id)
            )
            facility = fac_result.scalar_one_or_none()
            if facility:
                # Update coordinates if CHW accuracy is good
                if verification.accuracy_meters and verification.accuracy_meters < 50:
                    facility.latitude = verification.latitude
                    facility.longitude = verification.longitude
                    result.verifications_processed += 1
                else:
                    result.conflicts.append({
                        "type": "verification",
                        "id": verification.facility_id,
                        "reason": f"GPS accuracy too low: {verification.accuracy_meters}m",
                    })
            else:
                result.conflicts.append({
                    "type": "verification",
                    "id": verification.facility_id,
                    "reason": "Facility not found",
                })
        except Exception as exc:
            result.conflicts.append({
                "type": "verification",
                "id": verification.facility_id,
                "reason": str(exc),
            })

    # ── Commit all changes, then fan out delivery (never blocks ingest) ──
    await db.commit()
    for alert in pending_dispatch:
        await dispatch_alert(alert)

    return result


@router.get("/sync/status")
async def sync_status(
    user: dict = Depends(require_role("chw", "supervisor")),
):
    """Return sync status summary for the CHW's district."""
    return {
        "status": "ok",
        "server_time": datetime.now(UTC).isoformat(),
        "message": "Sync endpoint ready",
    }
