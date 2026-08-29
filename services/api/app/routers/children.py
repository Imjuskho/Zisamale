"""Child registration — single-record ingest from Android devices.

POST /api/v1/children
  - Accepts a child record from a CHW
  - Validates against ADR-005 (GPS coarsening, MUAC/weight/height bounds)
  - Idempotent: duplicate child_id returns 200 with existing record
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role, scoped_db
from app.models.child import Child
from app.schemas.child import ChildCreate, ChildResponse
from app.sync.engine import parse_client_datetime, token_chw_id

router = APIRouter(prefix="/api/v1", tags=["children"])


@router.post("/children", response_model=ChildResponse, status_code=201)
async def register_child(
    payload: ChildCreate,
    response: Response,
    db: AsyncSession = Depends(scoped_db("chw", "supervisor")),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    """Register a new child record.

    Idempotent: if child_id already exists, returns 200 with the existing record.
    GPS is coarsened to 2 decimal places per ADR-005.
    """
    chw_id = token_chw_id(user, payload.chw_id)

    # Check idempotency
    existing = await db.execute(
        select(Child).where(Child.child_id == payload.child_id)
    )
    row = existing.scalar_one_or_none()
    if row is not None:
        response.status_code = status.HTTP_200_OK
        return ChildResponse(
            child_id=row.child_id,
            sync_status=row.sync_status,
            created=False,
        )

    # Parse dates
    dob = None
    if payload.dob:
        dob = parse_client_datetime(payload.dob).date()
    row = Child(
        child_id=payload.child_id,
        household_id=payload.household_id,
        child_name=payload.child_name,
        dob=dob,
        sex=payload.sex,
        birth_weight_kg=payload.birth_weight_kg,
        vaccination_status=payload.vaccination_status,
        muac=payload.muac,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        danger_signs=payload.danger_signs,
        symptoms=payload.symptoms,
        risk_score=payload.risk_score,
        risk_category=payload.risk_category,
        top_risk_factors=[],
        iccm_category=payload.iccm_category,
        treatment_given=payload.treatment_given,
        referral_needed=payload.referral_needed,
        referral_facility_id=payload.referral_facility_id,
        referral_status=None,
        chw_id=chw_id,
        sync_status="synced",
    )
    db.add(row)
    await db.commit()

    return ChildResponse(
        child_id=row.child_id,
        sync_status="synced",
        created=True,
    )
