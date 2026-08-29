"""ML prediction endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/api/v1/ml", tags=["ml"])


class PregnancyRiskRequest(BaseModel):
    age: int | None = Field(None, ge=10, le=60)
    parity: int = Field(0, ge=0)
    gravida: int = Field(1, ge=1)
    prior_stillbirths: int = Field(0, ge=0)
    prior_csections: int = Field(0, ge=0)
    bp_systolic: int | None = Field(None, ge=60, le=250)
    bp_diastolic: int | None = Field(None, ge=30, le=150)
    hemoglobin: float | None = Field(None, ge=3.0, le=20.0)
    food_security_score: int | None = Field(None, ge=1, le=5)
    distance_to_facility_km: float | None = Field(None, ge=0, le=100)


class ChildRiskRequest(BaseModel):
    age_months: int | None = Field(None, ge=0, le=60)
    muac: float | None = Field(None, ge=5.0, le=25.0)
    weight_kg: float | None = Field(None, ge=0.5, le=30.0)
    height_cm: float | None = Field(None, ge=30, le=130)
    has_fever: bool = False
    has_cough: bool = False
    has_diarrhea: bool = False
    danger_signs: list[str] = []


class RiskScoreResponse(BaseModel):
    risk_score: float
    risk_category: str
    top_factors: list[str]
    model_version: str = "rule-based-v1"


@router.post("/predict/pregnancy-risk", response_model=RiskScoreResponse)
async def predict_pregnancy_risk(
    body: PregnancyRiskRequest,
    user: dict = Depends(get_current_user),
):
    from app.ml.risk_scorer import score_pregnancy

    result = score_pregnancy(
        age=body.age,
        parity=body.parity,
        prior_stillbirths=body.prior_stillbirths,
        prior_csections=body.prior_csections,
        bp_systolic=body.bp_systolic,
        bp_diastolic=body.bp_diastolic,
        hemoglobin=body.hemoglobin,
        food_security_score=body.food_security_score,
        distance_km=body.distance_to_facility_km,
    )

    return RiskScoreResponse(
        risk_score=result["risk_score"],
        risk_category=result["risk_category"],
        top_factors=result["top_factors"],
    )


@router.post("/predict/child-risk", response_model=RiskScoreResponse)
async def predict_child_risk(
    body: ChildRiskRequest,
    user: dict = Depends(get_current_user),
):
    from app.ml.risk_scorer import score_child

    result = score_child(
        age_months=body.age_months,
        muac=body.muac,
        weight_kg=body.weight_kg,
        height_cm=body.height_cm,
        has_fever=body.has_fever,
        has_cough=body.has_cough,
        has_diarrhea=body.has_diarrhea,
        danger_signs=body.danger_signs,
    )

    return RiskScoreResponse(
        risk_score=result["risk_score"],
        risk_category=result["risk_category"],
        top_factors=result["top_factors"],
    )


# ── Edge model telemetry (M3) ──────────────────────────────────────


class ModelTelemetryRecord(BaseModel):
    kind: str = Field(..., pattern="^(pregnancy|child)$")
    model_version: str
    source: str = Field("bundled_model", pattern="^(bundled_model|rule_based)$")
    inference_count: int = Field(0, ge=0)
    fallback_count: int = Field(0, ge=0)
    latency_ms_avg: float | None = Field(None, ge=0)
    device_id: str | None = None
    app_version: str | None = None


class ModelTelemetryBatch(BaseModel):
    records: list[ModelTelemetryRecord] = Field(default_factory=list)


class TelemetryAck(BaseModel):
    accepted: int


@router.post("/telemetry", response_model=TelemetryAck)
async def report_model_telemetry(
    batch: ModelTelemetryBatch,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    """Receive edge inference stats from the Android app (best-effort)."""
    from app.models.ml_telemetry import ModelTelemetry

    for record in batch.records[:100]:
        db.add(
            ModelTelemetry(
                chw_id=user.get("chw_id") or user.get("id"),
                device_id=record.device_id,
                kind=record.kind,
                model_version=record.model_version,
                source=record.source,
                inference_count=record.inference_count,
                fallback_count=record.fallback_count,
                latency_ms_avg=record.latency_ms_avg,
                app_version=record.app_version,
            )
        )
    await db.commit()
    return TelemetryAck(accepted=len(batch.records[:100]))
