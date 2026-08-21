from __future__ import annotations

from pydantic import BaseModel, model_validator


class VisitCreate(BaseModel):
    visit_id: str | None = None
    household_id: str
    chw_id: str | None = None
    visit_date: str
    pregnancy_id: str | None = None
    child_id: str | None = None
    visit_type: str
    symptoms: list[str] = []
    danger_signs: list[str] = []
    measurements: dict = {}
    ai_recommendation: dict | None = None
    ai_risk_score: float | None = None
    chw_override: bool = False
    chw_override_reason: str | None = None
    chw_notes: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None
    photos: list[str] = []

    @model_validator(mode="after")
    def override_requires_reason(self) -> VisitCreate:
        if self.chw_override and not (self.chw_override_reason or "").strip():
            raise ValueError("chw_override_reason is required when chw_override is true")
        return self


class VisitResponse(BaseModel):
    visit_id: str
    sync_status: str
    created: bool = True
    next_visit_recommendation: dict | None = None
