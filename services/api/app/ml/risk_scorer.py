"""Server-side risk scoring engine (mirrors Android RiskScorer)."""

from __future__ import annotations


def score_pregnancy(
    age: int | None = None,
    parity: int = 0,
    prior_stillbirths: int = 0,
    prior_csections: int = 0,
    bp_systolic: int | None = None,
    bp_diastolic: int | None = None,
    hemoglobin: float | None = None,
    food_security_score: int | None = None,
    distance_km: float | None = None,
) -> dict:
    score = 0.0
    factors = []

    if age is not None and age < 18:
        score += 1.5
        factors.append("Age under 18")
    if age is not None and age > 35:
        score += 1.0
        factors.append("Age over 35")
    if parity == 0:
        score += 1.2
        factors.append("First pregnancy (no prior ANC)")
    if prior_stillbirths > 0:
        score += 2.0
        factors.append(f"History of stillbirth ({prior_stillbirths})")
    if prior_csections > 0:
        score += 1.0
        factors.append(f"Prior C-section ({prior_csections})")
    if bp_systolic is not None and bp_systolic > 140:
        score += 2.5
        factors.append(f"High systolic BP ({bp_systolic})")
    if bp_diastolic is not None and bp_diastolic > 90:
        score += 2.0
        factors.append(f"High diastolic BP ({bp_diastolic})")
    if hemoglobin is not None and hemoglobin < 8.0:
        score += 2.0
        factors.append(f"Low hemoglobin ({hemoglobin}g/dL)")
    if food_security_score is not None and food_security_score <= 2:
        score += 1.0
        factors.append(f"Food insecure (score: {food_security_score})")
    if distance_km is not None and distance_km > 10:
        score += 1.5
        factors.append(f"Far from facility ({distance_km}km)")

    score = max(0.0, min(10.0, score))

    if score <= 3.0:
        category = "low"
    elif score <= 6.0:
        category = "medium"
    elif score <= 8.0:
        category = "high"
    else:
        category = "critical"

    return {
        "risk_score": round(score, 1),
        "risk_category": category,
        "top_factors": factors[:3],
    }


def score_child(
    age_months: int | None = None,
    muac: float | None = None,
    weight_kg: float | None = None,
    height_cm: float | None = None,
    has_fever: bool = False,
    has_cough: bool = False,
    has_diarrhea: bool = False,
    danger_signs: list[str] | None = None,
) -> dict:
    danger_signs = danger_signs or []
    score = 0.0
    factors = []

    if danger_signs:
        score += 5.0
        factors.append(f"Danger signs present: {', '.join(danger_signs)}")
    if muac is not None and muac < 11.5:
        score += 3.0
        factors.append(f"Severe acute malnutrition (MUAC: {muac}cm)")
    elif muac is not None and muac < 12.5:
        score += 1.5
        factors.append(f"Moderate acute malnutrition (MUAC: {muac}cm)")
    if has_fever:
        score += 1.0
        factors.append("Fever present")
    if has_cough and has_diarrhea:
        score += 1.5
        factors.append("Multiple symptoms (cough + diarrhea)")
    if age_months is not None and age_months < 6:
        score += 0.5
        factors.append("Infant under 6 months")

    score = max(0.0, min(10.0, score))

    if score <= 3.0:
        category = "low"
    elif score <= 6.0:
        category = "medium"
    elif score <= 8.0:
        category = "high"
    else:
        category = "critical"

    return {
        "risk_score": round(score, 1),
        "risk_category": category,
        "top_factors": factors[:3],
    }
