"""CHUMA-AI: Supply Chain Stockout Prediction Pipeline."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "stock_on_hand",
    "monthly_consumption",
    "months_of_supply",
    "lead_time_days",
    "consumption_trend",
    "consumption_volatility",
    "seasonal_factor",
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["facility_idx", "month"]).copy()

    df["consumption_trend"] = df.groupby("facility_idx")["monthly_consumption"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df["consumption_volatility"] = df.groupby("facility_idx")["monthly_consumption"].transform(
        lambda x: x.rolling(3, min_periods=1).std().fillna(0)
    )
    df["seasonal_factor"] = np.sin(2 * np.pi * df["month"] / 12)

    df["stockout_in_4_weeks"] = (
        df.groupby("facility_idx")["stockout_occurred"]
        .transform(lambda x: x.shift(-4).fillna(0).astype(int))
    )

    return df.dropna(subset=FEATURE_COLS)


def _make_model() -> XGBClassifier:
    return XGBClassifier(
        use_label_encoder=False,
        eval_metric="logloss",
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
    )


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
        y_proba = clf.predict_proba(X_val)[:, 1]

        acc_scores.append(accuracy_score(y_val, y_pred))
        try:
            auc_scores.append(roc_auc_score(y_val, y_proba))
        except ValueError:
            auc_scores.append(0.0)

        logger.info(f"  Fold {fold}: accuracy={acc_scores[-1]:.4f}  auc={auc_scores[-1]:.4f}")

    return {
        "cv_accuracy_mean": round(float(np.mean(acc_scores)), 4),
        "cv_accuracy_std": round(float(np.std(acc_scores)), 4),
        "cv_auc_mean": round(float(np.mean(auc_scores)), 4),
        "cv_auc_std": round(float(np.std(auc_scores)), 4),
    }


def train(df: pd.DataFrame, output_dir: Path) -> dict:
    df_featured = engineer_features(df)

    X = df_featured[FEATURE_COLS]
    y = df_featured["stockout_in_4_weeks"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = _make_model()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    try:
        auc = roc_auc_score(y_test, y_proba)
    except ValueError:
        auc = 0.0

    logger.info("Running 5-fold cross-validation...")
    cv_metrics = _cross_validate(X, y)

    report = classification_report(y_test, y_pred, output_dict=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "chuma_stockout_predictor.joblib"
    joblib.dump(model, model_path)

    feature_importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    metrics = {
        "accuracy": round(accuracy, 4),
        "auc_roc": round(auc, 4),
        "ppv": round(report.get("1", {}).get("precision", 0), 4),
        "npv": round(report.get("0", {}).get("precision", 0), 4),
        "feature_importance": feature_importance,
        "train_size": len(X_train),
        "test_size": len(X_test),
        **cv_metrics,
    }

    metrics_path = output_dir / "chuma_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("CHUMA-AI model trained successfully")
    logger.info(f"  Accuracy: {accuracy:.4f}")
    logger.info(f"  AUC-ROC: {auc:.4f}")
    logger.info(f"  CV accuracy: {cv_metrics['cv_accuracy_mean']:.4f} +/- {cv_metrics['cv_accuracy_std']:.4f}")
    logger.info(f"  CV AUC: {cv_metrics['cv_auc_mean']:.4f} +/- {cv_metrics['cv_auc_std']:.4f}")
    logger.info(f"  Model saved to: {model_path}")

    return metrics


if __name__ == "__main__":
    from data.synthetic import generate_supply_data

    df = generate_supply_data(n_facilities=20, n_months=24)
    output = Path("models/trained/chuma")
    metrics = train(df, output)
    print(json.dumps(metrics, indent=2))
