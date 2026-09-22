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

from app.alerts.service import dispatch_alert, emit_alert
from app.deps import require_role, scoped_db
from app.models.child import Child
from app.models.facility import Facility
from app.models.pregnancy import Pregnancy
from app.models.visit import Visit
from app.sync.engine import (
    SyncEntity,
    apply_batch,
    coarsen_gps,
    coerce_datetime_field,
    parse_client_datetime,
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


class PregnancyPayload(BaseModel):
    pregnancy_id: str
    household_id: str
    woman_name: str
    age: int
    parity: int = 0
    gravida: int = 1
    lmp_date: str | None = None
    edd_date: str | None = None
    prior_stillbirths: int = 0
    prior_csections: int = 0
    prior_pph: int = 0
    hiv_status: str | None = None
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    hemoglobin: float | None = None
    danger_signs: list[str] = Field(default_factory=list)
    risk_score: float | None = None
    risk_category: str = "low"
    next_visit_date: str | None = None
    referral_needed: bool = False
    referral_facility_id: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None


class ChildPayload(BaseModel):
    child_id: str
    household_id: str
    child_name: str
    dob: str | None = None
    sex: str | None = None
    birth_weight_kg: float | None = None
    vaccination_status: dict = Field(default_factory=dict)
    muac: float | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    danger_signs: list[str] = Field(default_factory=list)
    symptoms: list[str] = Field(default_factory=list)
    risk_score: float | None = None
    risk_category: str = "low"
    iccm_category: str = "uncomplicated"
    treatment_given: str | None = None
    referral_needed: bool = False
    referral_facility_id: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None


class CHWBatchUpload(BaseModel):
    device_id: str
    chw_id: str
    chw_name: str
    district_id: str | None = None
    last_sync_timestamp: str | None = None
    visits: list[VisitPayload] = Field(default_factory=list)
    pregnancies: list[PregnancyPayload] = Field(default_factory=list)
    children: list[ChildPayload] = Field(default_factory=list)
    stock_reports: list[StockReport] = Field(default_factory=list)
    facility_verifications: list[FacilityVerification] = Field(default_factory=list)


class SyncResult(BaseModel):
    visits_processed: int = 0
    visits_created: int = 0
    visits_updated: int = 0
    pregnancies_processed: int = 0
    pregnancies_created: int = 0
    pregnancies_updated: int = 0
    children_processed: int = 0
    children_created: int = 0
    children_updated: int = 0
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


# ── Pregnancy entity ───────────────────────────────────────────────

_PREGNANCY_UPDATABLE = (
    "household_id", "woman_name", "age", "parity", "gravida",
    "lmp_date", "edd_date", "prior_stillbirths", "prior_csections",
    "prior_pph", "hiv_status", "bp_systolic", "bp_diastolic",
    "hemoglobin", "danger_signs", "risk_score", "risk_category",
    "next_visit_date", "referral_needed", "referral_facility_id",
    "gps_lat", "gps_lon",
)


def _parse_date_field(raw: Any):
    if raw is None:
        return None
    return parse_client_datetime(raw).date()


def _build_pregnancy(item: dict) -> dict:
    return dict(
        household_id=item.get("household_id"),
        woman_name=item.get("woman_name"),
        age=item.get("age"),
        parity=item.get("parity", 0),
        gravida=item.get("gravida", 1),
        lmp_date=_parse_date_field(item.get("lmp_date")),
        edd_date=_parse_date_field(item.get("edd_date")),
        prior_stillbirths=item.get("prior_stillbirths", 0),
        prior_csections=item.get("prior_csections", 0),
        prior_pph=item.get("prior_pph", 0),
        hiv_status=item.get("hiv_status"),
        bp_systolic=item.get("bp_systolic"),
        bp_diastolic=item.get("bp_diastolic"),
        hemoglobin=item.get("hemoglobin"),
        danger_signs=item.get("danger_signs") or [],
        risk_score=item.get("risk_score"),
        risk_category=item.get("risk_category", "low"),
        top_risk_factors=[],
        next_visit_date=_parse_date_field(item.get("next_visit_date")),
        referral_needed=bool(item.get("referral_needed")),
        referral_facility_id=item.get("referral_facility_id"),
        referral_status=None,
        is_active=True,
        sync_status="synced",
    )


def _update_pregnancy(row: Pregnancy, item: dict) -> None:
    for field_name in _PREGNANCY_UPDATABLE:
        if field_name in ("lmp_date", "edd_date", "next_visit_date"):
            setattr(row, field_name, _parse_date_field(item.get(field_name)))
        else:
            setattr(row, field_name, item.get(field_name))


PREGNANCY_ENTITY = SyncEntity(
    model=Pregnancy,
    natural_key="pregnancy_id",
    build=_build_pregnancy,
    update=_update_pregnancy,
    transforms=(coarsen_gps,),
)


# ── Child entity ───────────────────────────────────────────────────

_CHILD_UPDATABLE = (
    "household_id", "child_name", "dob", "sex", "birth_weight_kg",
    "vaccination_status", "muac", "weight_kg", "height_cm",
    "danger_signs", "symptoms", "risk_score", "risk_category",
    "iccm_category", "treatment_given", "referral_needed",
    "referral_facility_id", "gps_lat", "gps_lon",
)


def _build_child(item: dict) -> dict:
    return dict(
        household_id=item.get("household_id"),
        child_name=item.get("child_name"),
        dob=_parse_date_field(item.get("dob")),
        sex=item.get("sex"),
        birth_weight_kg=item.get("birth_weight_kg"),
        vaccination_status=item.get("vaccination_status") or {},
        muac=item.get("muac"),
        weight_kg=item.get("weight_kg"),
        height_cm=item.get("height_cm"),
        danger_signs=item.get("danger_signs") or [],
        symptoms=item.get("symptoms") or [],
        risk_score=item.get("risk_score"),
        risk_category=item.get("risk_category", "low"),
        top_risk_factors=[],
        iccm_category=item.get("iccm_category", "uncomplicated"),
        treatment_given=item.get("treatment_given"),
        referral_needed=bool(item.get("referral_needed")),
        referral_facility_id=item.get("referral_facility_id"),
        referral_status=None,
        sync_status="synced",
    )


def _update_child(row: Child, item: dict) -> None:
    for field_name in _CHILD_UPDATABLE:
        if field_name == "dob":
            setattr(row, field_name, _parse_date_field(item.get(field_name)))
        else:
            setattr(row, field_name, item.get(field_name))


CHILD_ENTITY = SyncEntity(
    model=Child,
    natural_key="child_id",
    build=_build_child,
    update=_update_child,
    transforms=(coarsen_gps,),
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

    # ── Process pregnancies ──────────────────────────────────────
    if upload.pregnancies:
        preg_batch = await apply_batch(
            db,
            PREGNANCY_ENTITY,
            [p.model_dump() for p in upload.pregnancies],
            owner_chw_id=owner,
        )
        result.pregnancies_created = preg_batch.created
        result.pregnancies_updated = preg_batch.updated
        result.pregnancies_processed = preg_batch.processed + preg_batch.skipped
        result.conflicts.extend(preg_batch.failures)

    # ── Process children ─────────────────────────────────────────
    if upload.children:
        child_batch = await apply_batch(
            db,
            CHILD_ENTITY,
            [c.model_dump() for c in upload.children],
            owner_chw_id=owner,
        )
        result.children_created = child_batch.created
        result.children_updated = child_batch.updated
        result.children_processed = child_batch.processed + child_batch.skipped
        result.conflicts.extend(child_batch.failures)

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
