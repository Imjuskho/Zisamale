from __future__ import annotations

from pydantic import BaseModel


class AlertResponse(BaseModel):
    alert_id: str
    disease: str
    ta_name: str
    risk_score: float
    alert_level: str
    predicted_cases: int
    confidence_interval: list[int]
    generated_at: str
    valid_until: str | None = None
    recommended_actions: list[str]
    response_status: str
    responded_by: str | None = None
    response_notes: str | None = None


class AlertRespond(BaseModel):
    response_status: str
    actions_taken: list[str] = []
    resources_deployed: dict = {}
    notes: str | None = None
    responded_by: str
