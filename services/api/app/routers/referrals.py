from __future__ import annotations

import random
import string
import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import actor_user_id, require_role
from app.models.referral import Referral
from app.schemas.referral import ReferralCreate, ReferralResponse

router = APIRouter(prefix="/api/v1", tags=["referrals"])


def _generate_referral_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _bound_chw_id(user: dict, requested: str | None) -> str:
    user_id = actor_user_id(user)
    if user.get("role") == "chw":
        return user_id
    return requested or user_id


@router.post("/referrals", response_model=ReferralResponse)
async def create_referral(
    body: ReferralCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    referral_id = body.referral_id or str(uuid.uuid4())
    existing_result = await db.execute(select(Referral).where(Referral.referral_id == referral_id))
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return ReferralResponse(
            referral_id=existing.referral_id,
            referral_code=existing.referral_code,
            facility_notification_status="queued" if not existing.facility_notified else "sent",
        )

    referral = Referral(
        referral_id=referral_id,
        visit_id=body.visit_id,
        patient_id=body.patient_id,
        patient_type="pregnancy",
        referral_reason=body.referral_reason,
        urgency=body.urgency,
        recommended_facilities=[f.model_dump() for f in body.recommended_facilities],
        selected_facility_id=body.selected_facility_id,
        chw_id=_bound_chw_id(user, body.chw_id),
        referral_code=_generate_referral_code(),
        facility_notified=False,
        status="pending",
    )
    db.add(referral)
    await db.flush()

    response.status_code = status.HTTP_201_CREATED
    return ReferralResponse(
        referral_id=referral.referral_id,
        referral_code=referral.referral_code,
        facility_notification_status="queued",
    )
