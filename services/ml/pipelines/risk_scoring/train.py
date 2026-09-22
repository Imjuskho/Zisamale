"""MAMA-AI: Maternal & Child Health Risk Scoring Pipeline."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "age",
    "parity",
    "gravida",
    "prior_stillbirths",
    "prior_csections",
    "prior_pph",
    "bp_systolic",
    "bp_diastolic",
    "hemoglobin",
    "food_security_score",
    "distance_to_facility_km",
]

LABEL_MAP = {"low": 0, "medium": 1, "high": 2, "critical": 3}
LABEL_NAMES = ["low", "medium", "high", "critical"]


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    X = df[FEATURE_COLS].copy()
    y = df["risk_category"].copy()
    return X, y


def _make_model() -> XGBClassifier:
    return XGBClassifier(
        use_label_encoder=False,
        eval_metric="mlogloss",
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
    )


def _temporal_cv(X: pd.DataFrame, y: pd.Series) -> dict:
    """Temporal CV: train on first 80% (chronological), validate on last 20%."""
    split = int(len(X) * 0.8)
    X_train, X_val = X.iloc[:split], X.iloc[split:]
    y_train, y_val = y.iloc[:split], y.iloc[split:]

    clf = _make_model()
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_val)
    y_proba = clf.predict_proba(X_val)

    acc = accuracy_score(y_val, y_pred)
    try:
        auc = roc_auc_score(y_val, y_proba, multi_class="ovr", average="weighted")
    except ValueError:
        auc = 0.0

    logger.info(f"  Temporal CV: accuracy={acc:.4f}  auc={auc:.4f}")

    return {
        "temporal_cv_accuracy": round(float(acc), 4),
        "temporal_cv_auc": round(float(auc), 4),
        "temporal_cv_train_size": int(split),
        "temporal_cv_val_size": int(len(X) - split),
    }


def _cross_validate(X: pd.DataFrame, y: pd.Series, n_folds: int = 5) -> dict:
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    acc_scores = []
    auc_scores = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        clf = _make_model()
        clf.fit(X_train, y_train)

        y_pred = clf.predict(X_val)
        y_proba = clf.predict_proba(X_val)

        acc_scores.append(accuracy_score(y_val, y_pred))
        try:
            auc_scores.append(
                roc_auc_score(y_val, y_proba, multi_class="ovr", average="weighted")
            )
        except ValueError:
            auc_scores.append(0.0)

        logger.info(
            f"  Fold {fold}: accuracy={acc_scores[-1]:.4f}  auc={auc_scores[-1]:.4f}"
        )

    return {
        "cv_accuracy_mean": round(float(np.mean(acc_scores)), 4),
        "cv_accuracy_std": round(float(np.std(acc_scores)), 4),
        "cv_auc_mean": round(float(np.mean(auc_scores)), 4),
        "cv_auc_std": round(float(np.std(auc_scores)), 4),
    }


def train(df: pd.DataFrame, output_dir: Path) -> dict:
    X, y = prepare_features(df)
    y_encoded = y.map(LABEL_MAP)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    model = _make_model()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")

    logger.info("Running 5-fold cross-validation...")
    cv_metrics = _cross_validate(X, y_encoded)

    logger.info(
        "Running temporal cross-validation (first 80% train, last 20% validate)..."
    )
    temporal_metrics = _temporal_cv(X, y_encoded)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "mama_risk_scorer.joblib"
    joblib.dump(model, model_path)

    feature_importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    metrics = {
        "accuracy": round(accuracy, 4),
        "auc_roc_weighted": round(auc, 4),
        "feature_importance": feature_importance,
        "train_size": len(X_train),
        "test_size": len(X_test),
        **cv_metrics,
        **temporal_metrics,
    }

    metrics_path = output_dir / "mama_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("MAMA-AI model trained successfully")
    logger.info(f"  Accuracy: {accuracy:.4f}")
    logger.info(f"  AUC-ROC (weighted): {auc:.4f}")
    logger.info(
        f"  CV accuracy: {cv_metrics['cv_accuracy_mean']:.4f} +/- {cv_metrics['cv_accuracy_std']:.4f}"
    )
    logger.info(
        f"  CV AUC: {cv_metrics['cv_auc_mean']:.4f} +/- {cv_metrics['cv_auc_std']:.4f}"
    )
    logger.info(f"  Temporal CV AUC: {temporal_metrics['temporal_cv_auc']:.4f}")
    logger.info(f"  Model saved to: {model_path}")
    logger.info(f"  Metrics saved to: {metrics_path}")

    return metrics


def predict(model_path: Path, features: dict) -> dict:
    model = joblib.load(model_path)

    X = pd.DataFrame([features])[FEATURE_COLS]
    proba = model.predict_proba(X)[0]
    pred_idx = int(np.argmax(proba))
    inv_map = {0: "low", 1: "medium", 2: "high", 3: "critical"}

    return {
        "risk_category": inv_map[pred_idx],
        "risk_score": round(float(max(proba) * 10), 1),
        "probabilities": {inv_map[i]: round(float(p), 4) for i, p in enumerate(proba)},
    }


if __name__ == "__main__":
    from data.synthetic import generate_mama_data

    df = generate_mama_data(n=1000)
    output = Path("models/trained/mama")
    metrics = train(df, output)
    print(json.dumps(metrics, indent=2))
