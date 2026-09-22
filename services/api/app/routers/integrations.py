"""Integration management endpoints: DHIS2 sync/status, LMIS upload, overview."""

from __future__ import annotations

import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import require_role
from app.integrations.cht_mapping import field_map_catalog
from app.integrations.circuit_breaker import (
    CircuitOpenError,
    all_breaker_stats,
)
from app.integrations.dhis2 import DHIS2Client, DHIS2Error
from app.integrations.ichis import ICHISAdapter
from app.integrations.ingest import ingest_cht_documents, ingest_dhis2_rows, ingest_from_dhis2
from app.integrations.lmis import LMISClient

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])

_last_sync: dict[str, str] = {}
_sync_lock_held: set[str] = set()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _record_sync(name: str) -> None:
    _last_sync[name] = _now_iso()


class CHTIngestRequest(BaseModel):
    documents: list[dict[str, Any]] = Field(default_factory=list)


class DHIS2IngestRequest(BaseModel):
    district_id: str
    org_units: list[str] = Field(default_factory=list)
    periods: str = ""
    rows: list[Any] | None = None
    generate_alerts: bool = True


class DHIS2SyncRequest(BaseModel):
    district_id: str
    org_units: list[str] = Field(default_factory=list)
    periods: str = "LAST_12_WEEKS"
    data_elements: list[str] = Field(default_factory=list)
    generate_alerts: bool = True


# ------------------------------------------------------------------ existing


@router.get("/cht/field-map")
async def cht_field_map(user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor"))):
    return field_map_catalog()


@router.post("/cht/ingest")
async def cht_ingest(
    body: CHTIngestRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    counts = await ingest_cht_documents(db, body.documents)
    return {"status": "ok", **counts}


@router.post("/dhis2/ingest")
async def dhis2_ingest(
    body: DHIS2IngestRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    if body.rows is not None:
        counts = await ingest_dhis2_rows(
            db,
            district_id=body.district_id,
            rows=body.rows,
            generate_alerts=body.generate_alerts,
        )
    else:
        org_units = body.org_units or [body.district_id]
        periods = body.periods or "LAST_12_WEEKS"
        counts = await ingest_from_dhis2(
            db,
            district_id=body.district_id,
            org_units=org_units,
            periods=periods,
            generate_alerts=body.generate_alerts,
        )
    _record_sync("dhis2")
    return {"status": "ok", **counts}


# --------------------------------------------------------------------- DHIS2


@router.post("/dhis2/sync")
async def dhis2_sync(
    body: DHIS2SyncRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """Trigger a DHIS2 analytics pull and persist the weekly cells."""
    client = DHIS2Client()
    if not client.configured:
        raise HTTPException(
            status_code=503,
            detail="DHIS2 integration is not configured",
        )
    if body.district_id in _sync_lock_held:
        raise HTTPException(status_code=409, detail="Sync already in progress")

    elements = body.data_elements or [
        settings.dhis2_malaria_data_element,
        settings.dhis2_diarrhea_data_element,
        settings.dhis2_pneumonia_data_element,
    ]
    org_units = body.org_units or [body.district_id]

    _sync_lock_held.add(body.district_id)
    try:
        rows = await client.fetch_analytics(
            org_units=org_units, data_elements=elements, periods=body.periods
        )
        counts = await ingest_dhis2_rows(
            db,
            district_id=body.district_id,
            rows=rows,
            generate_alerts=body.generate_alerts,
        )
    except CircuitOpenError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"DHIS2 circuit breaker is open; retry in {exc.retry_after:.0f}s",
        ) from exc
    except DHIS2Error as exc:
        raise HTTPException(status_code=502, detail=f"DHIS2 sync failed: {exc}") from exc
    finally:
        _sync_lock_held.discard(body.district_id)

    _record_sync("dhis2")
    return {
        "status": "ok",
        "district_id": body.district_id,
        "periods": body.periods,
        "synced_at": _last_sync["dhis2"],
        **counts,
    }


@router.get("/dhis2/status")
async def dhis2_status(
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    client = DHIS2Client()
    breaker_stats = client.breaker.stats()
    state = breaker_stats.get("state")
    connected = bool(client.configured) and state != "open"
    return {
        "integration": "dhis2",
        "configured": client.configured,
        "connected": connected,
        "base_url": client.base_url or None,
        "circuit_state": state,
        "circuit_breaker": breaker_stats,
        "cache_ttl_hours": client.cache_ttl_seconds / 3600.0,
        "retry_delays_seconds": list(client.retry_delays),
        "last_sync_at": _last_sync.get("dhis2"),
        "checked_at": _now_iso(),
    }


# ---------------------------------------------------------------------- LMIS


@router.post("/lmis/upload")
async def lmis_upload(
    file: UploadFile,
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """Upload a manually-exported LMIS stock CSV for parsing/validation."""
    suffix = Path(file.filename or "").suffix or ".csv"
    if suffix.lower() != ".csv":
        raise HTTPException(status_code=422, detail="Only .csv uploads are accepted")
    try:
        contents = await file.read()
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="File must be UTF-8 CSV") from exc

    upload_dir = Path(tempfile.gettempdir()) / "zisamale_lmis_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / f"{uuid.uuid4().hex}{suffix}"
    path.write_text(decoded, encoding="utf-8")

    try:
        records = LMISClient.parse_csv(path, kind="stock")
    except ValueError as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        await file.close()

    anomalies = [r for r in records if r.get("anomalies")]
    _record_sync("lmis")
    return {
        "status": "ok",
        "filename": file.filename,
        "rows_parsed": len(records),
        "rows_valid": len(records) - len(anomalies),
        "rows_with_anomalies": len(anomalies),
        "anomaly_rows": [
            {"row_number": r.get("row_number"), "anomalies": r["anomalies"]} for r in anomalies[:25]
        ],
    }


# ------------------------------------------------------------------- overall


@router.get("/status")
async def integrations_status(
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    """Connection/configuration status of every external integration."""
    dhis2_client = DHIS2Client()
    ichis = ICHISAdapter()
    lmis = LMISClient()

    def _integration(name: str, configured: bool, extra: dict[str, Any]) -> dict[str, Any]:
        return {
            "integration": name,
            "configured": configured,
            "last_sync_at": _last_sync.get(name),
            **extra,
        }

    return {
        "checked_at": _now_iso(),
        "integrations": {
            "dhis2": _integration(
                "dhis2",
                dhis2_client.configured,
                {
                    "base_url": dhis2_client.base_url or None,
                    "circuit_state": dhis2_client.breaker.state.value,
                    "circuit_breaker": dhis2_client.breaker.stats(),
                },
            ),
            "lmis": _integration(
                "lmis",
                bool(lmis.configured or lmis.csv_path.is_file()),
                {
                    "rest_configured": lmis.configured,
                    "csv_fallback_available": lmis.csv_path.is_file(),
                },
            ),
            "ichis": _integration(
                "ichis",
                bool(ichis.base_url),
                {"base_url": ichis.base_url or None},
            ),
        },
        "circuit_breakers": all_breaker_stats(),
    }
