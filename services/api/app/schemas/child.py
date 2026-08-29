from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ChildCreate(BaseModel):
    child_id: str
    household_id: str
    child_name: str
    dob: str | None = None
    sex: str | None = None
    birth_weight_kg: float | None = Field(default=None, ge=0.5, le=7.0)
    vaccination_status: dict = Field(default_factory=dict)
    muac: float | None = Field(default=None, ge=5.0, le=25.0)
    weight_kg: float | None = Field(default=None, ge=0.5, le=30.0)
    height_cm: float | None = Field(default=None, ge=30.0, le=130.0)
    danger_signs: list[str] = Field(default_factory=list)
    symptoms: list[str] = Field(default_factory=list)
    risk_score: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_category: str = "low"
    iccm_category: str = "uncomplicated"
    treatment_given: str | None = None
    referral_needed: bool = False
    referral_facility_id: str | None = None
    chw_id: str | None = None
    gps_lat: float | None = None
    gps_lon: float | None = None
    created_at: str | None = None

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str | None) -> str | None:
        if v is not None and v not in ("male", "female"):
            raise ValueError(f"sex must be one of: male, female")
        return v

    @field_validator("risk_category")
    @classmethod
    def validate_risk_category(cls, v: str) -> str:
        if v not in ("low", "medium", "high", "critical"):
            raise ValueError(f"risk_category must be one of: low, medium, high, critical")
        return v

    @field_validator("iccm_category")
    @classmethod
    def validate_iccm_category(cls, v: str) -> str:
        if v not in ("uncomplicated", "severe", "referral"):
            raise ValueError(f"iccm_category must be one of: uncomplicated, severe, referral")
        return v


class ChildResponse(BaseModel):
    child_id: str
    sync_status: str
    created: bool = True
