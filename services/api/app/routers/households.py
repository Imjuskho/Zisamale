"""Household registry batch sync — contract delta for M2 offline-first.

The Android app registers households locally while offline (sync_status
"pending"); when connectivity returns SyncManager pushes them here in one
batch. Upsert/conflict/de-identification policy lives in app/sync/engine.py;
this router is a thin adapter over it.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role, scoped_db
from app.models.household import Household
from app.sync.engine import SyncEntity, apply_batch, coarsen_gps, token_chw_id

router = APIRouter(prefix="/api/v1/households", tags=["households"])

MAX_BATCH = 500


class HouseholdPayload(BaseModel):
    household_id: str
    chw_id: str | None = None  # advisory only — server binds token identity
    gps_lat: float | None = None
    gps_lon: float | None = None
    ta_name: str | None = None
    village_name: str | None = None
    water_source: str | None = None
    sanitation_type: str | None = None
    food_security_score: int | None = None
    distance_to_facility_km: float | None = None
    transport_cost_mwk: float | None = None
    household_size: int | None = None
    last_updated: str | None = None  # client epoch-ms or ISO; advisory only


class HouseholdBatchUpload(BaseModel):
    device_id: str | None = None
    chw_id: str | None = None  # honored for supervisors, overridden for CHWs
    households: list[HouseholdPayload] = Field(default_factory=list)

    model_config = {"extra": "forbid"}


class HouseholdSyncResult(BaseModel):
    processed: int = 0
    created: int = 0
    updated: int = 0
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    sync_timestamp: str = ""


_UPDATABLE_FIELDS = (
    "ta_name",
    "village_name",
    "water_source",
    "sanitation_type",
    "food_security_score",
    "distance_to_facility_km",
    "transport_cost_mwk",
    "household_size",
)


def _build_household(item: dict) -> dict:
    return dict(
        **{f: item.get(f) for f in _UPDATABLE_FIELDS},
        gps_lat=item.get("gps_lat"),
        gps_lon=item.get("gps_lon"),
        sync_status="synced",
    )


def _update_household(row: Household, item: dict) -> None:
    for field_name in _UPDATABLE_FIELDS:
        setattr(row, field_name, item.get(field_name))
    row.gps_lat = item.get("gps_lat")
    row.gps_lon = item.get("gps_lon")


HOUSEHOLD_ENTITY = SyncEntity(
    model=Household,
    natural_key="household_id",
    build=_build_household,
    update=_update_household,
    transforms=(coarsen_gps,),
)


@router.post("/batch", response_model=HouseholdSyncResult)
async def sync_households(
    upload: HouseholdBatchUpload,
    db: AsyncSession = Depends(scoped_db("chw", "supervisor")),
    user: dict = Depends(require_role("chw", "supervisor")),
) -> HouseholdSyncResult:
    """Upsert a batch of CHW-registered households.

    - Same household_id → update in place (client wins unless the server row
      is already "synced", which is flagged as a conflict).
    - GPS coarsened to ~1 km at this boundary (ADR-005 §1).
    - Per-item errors are reported in `conflicts` and never fail the batch.
    """
    result = HouseholdSyncResult(sync_timestamp=datetime.now(UTC).isoformat())

    if len(upload.households) > MAX_BATCH:
        result.conflicts.append({
            "type": "batch",
            "id": None,
            "reason": f"Batch too large: {len(upload.households)} > {MAX_BATCH}",
        })
        return result

    batch = await apply_batch(
        db,
        HOUSEHOLD_ENTITY,
        [h.model_dump() for h in upload.households],
        owner_chw_id=token_chw_id(user, upload.chw_id),
    )
    result.created = batch.created
    result.updated = batch.updated
    result.processed = batch.processed
    result.conflicts.extend(batch.failures)

    await db.commit()
    return result
