from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class PregnancyCreate(BaseModel):
    pregnancy_id: str
    household_id: str
    woman_name: str
    age: int = Field(ge=12, le=55)
    parity: int = Field(ge=0, le=15)
    gravida: int = Field(ge=1, le=20)
    lmp_date: str | None = None
    edd_date: str | None = None
    prior_stillbirths: int = Field(default=0, ge=0, le=10)
    prior_csections: int = Field(default=0, ge=0, le=10)
    prior_pph: int = Field(default=0, ge=0, le=10)
    hiv_status: str | None = None
    bp_systolic: int | None = Field(default=None, ge=60, le=250)
    bp_diastolic: int | None = Field(default=None, ge=40, le=150)
    hemoglobin: float | None = Field(default=None, ge=3.0, le=20.0)
    danger_signs: list[str] = Field(default_factory=list)
    risk_score: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_category: str = "low"
    next_visit_date: str | None = None
    referral_needed: bool = False
    referral_facility_id: str | None = None
    chw_id: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None
    created_at: str | None = None

    @field_validator("hiv_status")
    @classmethod
    def validate_hiv_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ("positive", "negative", "unknown", "declined"):
            raise ValueError("hiv_status must be one of: positive, negative, unknown, declined")
        return v

    @field_validator("risk_category")
    @classmethod
    def validate_risk_category(cls, v: str) -> str:
        if v not in ("low", "medium", "high", "critical"):
            raise ValueError("risk_category must be one of: low, medium, high, critical")
        return v

    @field_validator("bp_systolic", "bp_diastolic")
    @classmethod
    def validate_bp(cls, v: int | None) -> int | None:
        return v


class PregnancyResponse(BaseModel):
    pregnancy_id: str
    sync_status: str
    created: bool = True
