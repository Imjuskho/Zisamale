from __future__ import annotations

from pydantic import BaseModel


class RecommendedFacility(BaseModel):
    facility_id: str
    facility_name: str
    distance_km: float
    stock_status: dict = {}
    score: float


class ReferralCreate(BaseModel):
    referral_id: str | None = None
    visit_id: str
    patient_id: str
    referral_reason: str
    urgency: str = "routine"
    recommended_facilities: list[RecommendedFacility] = []
    selected_facility_id: str | None = None
    chw_id: str | None = None


class ReferralResponse(BaseModel):
    referral_id: str
    referral_code: str
    estimated_arrival: str | None = None
    facility_notification_status: str
