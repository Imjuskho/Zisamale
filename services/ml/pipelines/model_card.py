"""Model card generation: JSON cards with model info, metrics, and ethics."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_model_card(
    model_name: str,
    version: str,
    metrics: dict,
    training_data_info: dict,
    feature_names: list[str],
    description: str = "",
    limitations: list[str] | None = None,
    bias_considerations: list[str] | None = None,
    intended_use: str = "",
    output_path: Path | None = None,
) -> dict:
    card = {
        "model_card_version": "1.0",
        "model_details": {
            "name": model_name,
            "version": version,
            "description": description,
            "created_at": datetime.now(UTC).isoformat(),
        },
        "intended_use": intended_use,
        "training_data": {
            "source": training_data_info.get("source", "synthetic"),
            "n_samples": training_data_info.get("n_samples", 0),
            "n_features": training_data_info.get("n_features", 0),
            "feature_names": feature_names,
            "time_range": training_data_info.get("time_range", "N/A"),
            "geographic_scope": training_data_info.get("geographic_scope", "N/A"),
        },
        "metrics": metrics,
        "limitations": limitations
        or [
            "Model trained on synthetic data; performance on real clinical data may differ.",
            "Does not account for rare comorbidities not represented in training features.",
            "Requires periodic retraining as disease patterns evolve.",
        ],
        "bias_considerations": bias_considerations
        or [
            "Training data is synthetic and may not capture real demographic distributions.",
            "Facility-level variation in the synthetic data may not reflect actual health system disparities.",
            "Model predictions should be reviewed by qualified healthcare professionals.",
            "Populations under-represented in training data may receive less accurate predictions.",
        ],
        "ethical_considerations": [
            "Predictions are advisory and should not replace clinical judgment.",
            "Patient data used for inference must be handled in compliance with local privacy regulations.",
            "Model should not be used as sole basis for resource allocation decisions.",
        ],
    }

    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(card, f, indent=2)
        logger.info(f"Model card saved to {output_path}")

    return card


PIPELINE_CARDS = {
    "mama": {
        "description": "Maternal & Child Health Risk Scoring for antenatal care triage.",
        "intended_use": "Risk stratification of pregnant women to prioritize high-risk cases for clinical review.",
        "limitations": [
            "Synthetic training data; real-world performance may vary.",
            "Does not capture ultrasound or lab results not in feature set.",
            "Age range limited to 15-44 in training data.",
            "May underperform for populations with very different risk profiles.",
        ],
        "bias_considerations": [
            "Synthetic age distribution may not match real population demographics.",
            "Distance-to-facility feature may bias against remote communities.",
            "Hemoglobin thresholds based on WHO standards; local norms may differ.",
        ],
    },
    "ulalo": {
        "description": "Predictive Surveillance & Outbreak Detection for malaria.",
        "intended_use": "Early warning of malaria outbreaks to enable proactive resource mobilization.",
        "limitations": [
            "Trained on synthetic surveillance data with simplified transmission dynamics.",
            "Rainfall-outbreak lag may vary by local ecology and mosquito species.",
            "Does not incorporate real-time genomic or drug-resistance data.",
        ],
        "bias_considerations": [
            "Synthetic data may under-represent inter-annual climate variability.",
            "Facility reporting completeness not modeled; real surveillance gaps could affect predictions.",
        ],
    },
    "chuma": {
        "description": "Supply Chain Stockout Prediction for essential health commodities.",
        "intended_use": "Predict stockout risk 4 weeks ahead to trigger pre-emptive resupply.",
        "limitations": [
            "Lead-time distributions are synthetic; real logistics may have different patterns.",
            "Does not model supplier reliability or political disruptions.",
            "Commodity-level granularity not included (single commodity assumed).",
        ],
        "bias_considerations": [
            "Facility reliability factor in synthetic data may not capture real infrastructure gaps.",
            "Seasonal demand patterns are simplified; actual demand may have region-specific drivers.",
        ],
    },
}


def generate_pipeline_card(
    pipeline_key: str,
    version: str,
    metrics: dict,
    feature_names: list[str],
    training_data_info: dict,
    output_dir: Path,
) -> dict:
    defaults = PIPELINE_CARDS.get(pipeline_key, {})
    output_path = output_dir / f"{pipeline_key}_model_card.json"

    card = generate_model_card(
        model_name=f"zisamale_{pipeline_key}",
        version=version,
        metrics=metrics,
        training_data_info=training_data_info,
        feature_names=feature_names,
        description=defaults.get("description", ""),
        limitations=defaults.get("limitations"),
        bias_considerations=defaults.get("bias_considerations"),
        intended_use=defaults.get("intended_use", ""),
        output_path=output_path,
    )

    return card


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

    card = generate_pipeline_card(
        pipeline_key="mama",
        version="1.0.0",
        metrics={"accuracy": 0.87, "auc_roc_weighted": 0.92},
        feature_names=["age", "parity", "hemoglobin"],
        training_data_info={"n_samples": 500, "n_features": 11, "source": "synthetic"},
        output_dir=Path("models/cards"),
    )
    print(json.dumps(card, indent=2))
