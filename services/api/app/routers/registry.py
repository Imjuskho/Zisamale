"""Web registry endpoints — pregnancy and child views for DHO/MoHP dashboards.

All names pseudonymized for non-CHW callers per ADR-005.
GPS dropped; only TA-level location returned.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import require_role, scoped_db
from app.models.child import Child
from app.models.geography import TraditionalAuthority, Village
from app.models.household import Household
from app.models.pregnancy import Pregnancy

router = APIRouter(prefix="/api/v1", tags=["registry"])


def _pseudonymize_name(name: str | None, record_id: str) -> str:
    """Replace real name with HH-{short_id} for non-CHW callers."""
    if not name:
        return f"HH-{record_id[:8]}"
    return f"HH-{record_id[:8]}"


@router.get("/district/{district_id}/pregnancies")
async def list_pregnancies(
    district_id: str,
    ta_name: str | None = Query(default=None),
    risk_category: str | None = Query(default=None),
    synced_after: str | None = Query(default=None),
    db: AsyncSession = Depends(scoped_db("dho", "phim", "mohp")),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """List pregnancies for a district. Names pseudonymized for non-CHW callers."""
    stmt = (
        select(Pregnancy, Household)
        .join(Household, Pregnancy.household_id == Household.household_id)
        .join(Village, Household.village_id == Village.village_id)
        .join(TraditionalAuthority, Village.ta_id == TraditionalAuthority.ta_id)
        .where(TraditionalAuthority.district_id == district_id)
    )
    if ta_name:
        stmt = stmt.where(Household.ta_name == ta_name)
    if risk_category:
        stmt = stmt.where(Pregnancy.risk_category == risk_category)
    if synced_after:
        from app.sync.engine import parse_client_datetime

        after = parse_client_datetime(synced_after)
        stmt = stmt.where(Pregnancy.updated_at >= after)

    result = await db.execute(stmt)
    rows = result.all()

    pregnancies = []
    for pregnancy, household in rows:
        pregnancies.append(
            {
                "pregnancy_id": pregnancy.pregnancy_id,
                "household_id": pregnancy.household_id,
                "woman_name": _pseudonymize_name(pregnancy.woman_name, pregnancy.pregnancy_id),
                "age": pregnancy.age,
                "gravida": pregnancy.gravida,
                "parity": pregnancy.parity,
                "risk_score": pregnancy.risk_score,
                "risk_category": pregnancy.risk_category,
                "next_visit_date": str(pregnancy.next_visit_date)
                if pregnancy.next_visit_date
                else None,
                "referral_needed": pregnancy.referral_needed,
                "referral_status": pregnancy.referral_status,
                "chw_id": pregnancy.chw_id,
                "ta_name": household.ta_name if household else None,
                "village_name": household.village_name if household else None,
                "sync_status": pregnancy.sync_status,
            }
        )

    return {"pregnancies": pregnancies, "count": len(pregnancies)}


@router.get("/district/{district_id}/children")
async def list_children(
    district_id: str,
    ta_name: str | None = Query(default=None),
    risk_category: str | None = Query(default=None),
    iccm_category: str | None = Query(default=None),
    db: AsyncSession = Depends(scoped_db("dho", "phim", "mohp")),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """List children for a district. Names pseudonymized for non-CHW callers."""
    stmt = (
        select(Child, Household)
        .join(Household, Child.household_id == Household.household_id)
        .join(Village, Household.village_id == Village.village_id)
        .join(TraditionalAuthority, Village.ta_id == TraditionalAuthority.ta_id)
        .where(TraditionalAuthority.district_id == district_id)
    )
    if ta_name:
        stmt = stmt.where(Household.ta_name == ta_name)
    if risk_category:
        stmt = stmt.where(Child.risk_category == risk_category)
    if iccm_category:
        stmt = stmt.where(Child.iccm_category == iccm_category)

    result = await db.execute(stmt)
    rows = result.all()

    children = []
    for child, household in rows:
        children.append(
            {
                "child_id": child.child_id,
                "household_id": child.household_id,
                "child_name": _pseudonymize_name(child.child_name, child.child_id),
                "dob": str(child.dob) if child.dob else None,
                "sex": child.sex,
                "muac": child.muac,
                "weight_kg": child.weight_kg,
                "height_cm": child.height_cm,
                "risk_score": child.risk_score,
                "risk_category": child.risk_category,
                "iccm_category": child.iccm_category,
                "referral_needed": child.referral_needed,
                "referral_status": child.referral_status,
                "chw_id": child.chw_id,
                "ta_name": household.ta_name if household else None,
                "village_name": household.village_name if household else None,
                "sync_status": child.sync_status,
            }
        )

    return {"children": children, "count": len(children)}


@router.get("/pregnancy/{pregnancy_id}/timeline")
async def pregnancy_timeline(
    pregnancy_id: str,
    db: AsyncSession = Depends(scoped_db("dho", "phim", "mohp")),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """Get pregnancy timeline: all visits, risk changes, referrals."""
    from app.models.referral import Referral
    from app.models.visit import Visit

    # Get pregnancy
    preg_result = await db.execute(select(Pregnancy).where(Pregnancy.pregnancy_id == pregnancy_id))
    pregnancy = preg_result.scalar_one_or_none()
    if not pregnancy:
        raise HTTPException(status_code=404, detail="Pregnancy not found")

    # Get visits for this pregnancy
    visit_result = await db.execute(
        select(Visit).where(Visit.pregnancy_id == pregnancy_id).order_by(Visit.visit_date)
    )
    visits = visit_result.scalars().all()

    # Get referrals
    referral_result = await db.execute(select(Referral).where(Referral.patient_id == pregnancy_id))
    referrals = referral_result.scalars().all()

    return {
        "pregnancy": {
            "pregnancy_id": pregnancy.pregnancy_id,
            "woman_name": _pseudonymize_name(pregnancy.woman_name, pregnancy.pregnancy_id),
            "age": pregnancy.age,
            "gravida": pregnancy.gravida,
            "parity": pregnancy.parity,
            "risk_score": pregnancy.risk_score,
            "risk_category": pregnancy.risk_category,
            "next_visit_date": str(pregnancy.next_visit_date)
            if pregnancy.next_visit_date
            else None,
        },
        "visits": [
            {
                "visit_id": v.visit_id,
                "visit_date": str(v.visit_date) if v.visit_date else None,
                "danger_signs": v.danger_signs,
                "ai_risk_score": v.ai_risk_score,
                "chw_override": v.chw_override,
                "chw_notes": v.chw_notes,
            }
            for v in visits
        ],
        "referrals": [
            {
                "referral_id": r.referral_id,
                "referral_reason": r.referral_reason,
                "urgency": r.urgency,
                "status": r.status,
                "created_at": str(r.created_at) if hasattr(r, "created_at") else None,
            }
            for r in referrals
        ],
    }
