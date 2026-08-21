"""Prediction API: Load trained models and return predictions."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAMA_FEATURES = [
    "age", "parity", "gravida", "prior_stillbirths", "prior_csections",
    "prior_pph", "bp_systolic", "bp_diastolic", "hemoglobin",
    "food_security_score", "distance_to_facility_km",
]

SURV_FEATURES = [
    "cases_lag1", "cases_lag2", "cases_lag4", "cases_lag8",
    "rainfall_lag1", "rainfall_lag2", "rainfall_lag4",
    "temperature_lag1", "humidity_lag1", "week_number", "population_density",
]

SUPPLY_FEATURES = [
    "stock_on_hand", "monthly_consumption", "months_of_supply",
    "lead_time_days", "consumption_trend", "consumption_volatility", "seasonal_factor",
]

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "trained"


def _load_model(model_path: Path):
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}")
    return joblib.load(model_path)


def predict_pregnancy_risk(
    features: dict,
    model_path: Path | None = None,
) -> dict:
    if model_path is None:
        model_path = DEFAULT_MODEL_DIR / "mama" / "mama_risk_scorer.joblib"

    model = _load_model(model_path)

    missing = [f for f in MAMA_FEATURES if f not in features]
    if missing:
        raise ValueError(f"Missing required features: {missing}")

    X = pd.DataFrame([features])[MAMA_FEATURES]
    proba = model.predict_proba(X)[0]
    pred_idx = int(np.argmax(proba))

    label_map = {0: "low", 1: "medium", 2: "high", 3: "critical"}

    return {
        "risk_category": label_map[pred_idx],
        "risk_score": round(float(max(proba) * 10), 1),
        "probabilities": {
            label_map[i]: round(float(p), 4) for i, p in enumerate(proba)
        },
        "model_version": _get_model_version(model_path),
    }


def predict_outbreak_risk(
    features: dict,
    model_path: Path | None = None,
) -> dict:
    if model_path is None:
        model_path = DEFAULT_MODEL_DIR / "ulalo" / "ulalo_outbreak_predictor.joblib"

    model = _load_model(model_path)

    missing = [f for f in SURV_FEATURES if f not in features]
    if missing:
        raise ValueError(f"Missing required features: {missing}")

    X = pd.DataFrame([features])[SURV_FEATURES]
    proba = model.predict_proba(X)[0]
    pred_idx = int(np.argmax(proba))
    outbreak_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])

    risk_level = "low"
    if outbreak_prob > 0.8:
        risk_level = "critical"
    elif outbreak_prob > 0.6:
        risk_level = "high"
    elif outbreak_prob > 0.4:
        risk_level = "medium"

    return {
        "outbreak_risk": risk_level,
        "outbreak_probability": round(outbreak_prob, 4),
        "predicted_class": int(pred_idx),
        "probabilities": {
            "no_outbreak": round(float(proba[0]), 4),
            "outbreak": round(float(proba[1]) if len(proba) > 1 else float(proba[0]), 4),
        },
        "model_version": _get_model_version(model_path),
    }


def _get_model_version(model_path: Path) -> str:
    meta_path = model_path.parent / f"{model_path.stem}_metadata.json"
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        return meta.get("version", "unknown")
    return "unknown"


if __name__ == "__main__":
    sample_mama = {
        "age": 22, "parity": 0, "gravida": 1, "prior_stillbirths": 0,
        "prior_csections": 0, "prior_pph": 0, "bp_systolic": 130,
        "bp_diastolic": 85, "hemoglobin": 10.5, "food_security_score": 3,
        "distance_to_facility_km": 8.0,
    }
    sample_surv = {
        "cases_lag1": 25, "cases_lag2": 20, "cases_lag4": 18, "cases_lag8": 15,
        "rainfall_lag1": 30.0, "rainfall_lag2": 25.0, "rainfall_lag4": 20.0,
        "temperature_lag1": 27.0, "humidity_lag1": 65.0, "week_number": 42,
        "population_density": 200.0,
    }

    print("=== Pregnancy Risk ===")
    try:
        result = predict_pregnancy_risk(sample_mama)
        print(json.dumps(result, indent=2))
    except FileNotFoundError as e:
        print(f"  (Model not trained yet: {e})")

    print("\n=== Outbreak Risk ===")
    try:
        result = predict_outbreak_risk(sample_surv)
        print(json.dumps(result, indent=2))
    except FileNotFoundError as e:
        print(f"  (Model not trained yet: {e})")
