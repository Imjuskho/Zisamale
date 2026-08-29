"""Pregnancy registration — single-record ingest from Android devices.

POST /api/v1/pregnancies
  - Accepts a pregnancy record from a CHW
  - Validates against ADR-005 (GPS coarsening, age bounds, BP sanity)
  - Idempotent: duplicate pregnancy_id returns 200 with existing record
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role, scoped_db
from app.models.pregnancy import Pregnancy
from app.schemas.pregnancy import PregnancyCreate, PregnancyResponse
from app.sync.engine import parse_client_datetime, token_chw_id

router = APIRouter(prefix="/api/v1", tags=["pregnancies"])


@router.post("/pregnancies", response_model=PregnancyResponse, status_code=201)
async def register_pregnancy(
    payload: PregnancyCreate,
    response: Response,
    db: AsyncSession = Depends(scoped_db("chw", "supervisor")),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    """Register a new pregnancy record.

    Idempotent: if pregnancy_id already exists, returns 200 with the existing record.
    GPS is coarsened to 2 decimal places per ADR-005.
    """
    # Owner binding from JWT
    chw_id = token_chw_id(user, payload.chw_id)

    # Check idempotency
    existing = await db.execute(
        select(Pregnancy).where(Pregnancy.pregnancy_id == payload.pregnancy_id)
    )
    row = existing.scalar_one_or_none()
    if row is not None:
        response.status_code = status.HTTP_200_OK
        return PregnancyResponse(
            pregnancy_id=row.pregnancy_id,
            sync_status=row.sync_status,
            created=False,
        )

    # Parse dates
    lmp_date = None
    edd_date = None
    if payload.lmp_date:
        lmp_date = parse_client_datetime(payload.lmp_date).date()
    if payload.edd_date:
        edd_date = parse_client_datetime(payload.edd_date).date()
    next_visit_date = (
        parse_client_datetime(payload.next_visit_date).date()
        if payload.next_visit_date
        else None
    )

    row = Pregnancy(
        pregnancy_id=payload.pregnancy_id,
        household_id=payload.household_id,
        woman_name=payload.woman_name,
        age=payload.age,
        parity=payload.parity,
        gravida=payload.gravida,
        lmp_date=lmp_date,
        edd_date=edd_date,
        prior_stillbirths=payload.prior_stillbirths,
        prior_csections=payload.prior_csections,
        prior_pph=payload.prior_pph,
        hiv_status=payload.hiv_status,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        hemoglobin=payload.hemoglobin,
        danger_signs=payload.danger_signs,
        risk_score=payload.risk_score,
        risk_category=payload.risk_category,
        top_risk_factors=[],
        next_visit_date=next_visit_date,
        referral_needed=payload.referral_needed,
        referral_facility_id=payload.referral_facility_id,
        referral_status=None,
        is_active=True,
        chw_id=chw_id,
        sync_status="synced",
    )
    db.add(row)
    await db.commit()

    return PregnancyResponse(
        pregnancy_id=row.pregnancy_id,
        sync_status="synced",
        created=True,
    )
