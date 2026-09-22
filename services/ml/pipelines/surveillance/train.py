"""ULALO-AI: Predictive Surveillance & Outbreak Detection Pipeline."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
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
    "cases_lag1",
    "cases_lag2",
    "cases_lag4",
    "cases_lag8",
    "rainfall_lag1",
    "rainfall_lag2",
    "rainfall_lag4",
    "temperature_lag1",
    "humidity_lag1",
    "week_number",
    "population_density",
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["ta_idx", "year", "week_number"]).copy()

    for lag in [1, 2, 4, 8]:
        df[f"cases_lag{lag}"] = df.groupby("ta_idx")["confirmed_cases"].shift(lag)

    for lag in [1, 2, 4]:
        df[f"rainfall_lag{lag}"] = df.groupby("ta_idx")["rainfall_mm"].shift(lag)

    df["temperature_lag1"] = df.groupby("ta_idx")["temperature_c"].shift(1)
    df["humidity_lag1"] = df.groupby("ta_idx")["humidity_pct"].shift(1)
    df["population_density"] = np.random.uniform(50, 500, len(df))

    threshold = df["confirmed_cases"].quantile(0.90)
    df["outbreak"] = (df["confirmed_cases"] > threshold).astype(int)

    return df.dropna(subset=FEATURE_COLS)


def _make_model() -> XGBClassifier:
    return XGBClassifier(
        use_label_encoder=False,
        eval_metric="mlogloss",
        n_estimators=100,
        max_depth=5,
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
    df_featured = engineer_features(df)

    X = df_featured[FEATURE_COLS]
    y = df_featured["outbreak"]

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
    xgb_auc = auc

    # Compare XGBoost vs RandomForest, keep the best model
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf_model.fit(X_train, y_train)
    rf_pred = rf_model.predict(X_test)
    rf_proba = rf_model.predict_proba(X_test)[:, 1]
    rf_accuracy = accuracy_score(y_test, rf_pred)
    try:
        rf_auc = roc_auc_score(y_test, rf_proba)
    except ValueError:
        rf_auc = 0.0

    logger.info(
        f"Model comparison: XGBoost auc={auc:.4f} vs RandomForest auc={rf_auc:.4f}"
    )
    if (rf_auc, rf_accuracy) > (auc, accuracy):
        logger.info("RandomForest outperformed XGBoost; saving RandomForest model")
        model = rf_model
        y_pred = rf_pred
        y_proba = rf_proba
        accuracy = rf_accuracy
        auc = rf_auc
    else:
        logger.info("XGBoost retained as best model")

    logger.info("Running 5-fold cross-validation...")
    cv_metrics = _cross_validate(X, y)

    report = classification_report(y_test, y_pred, output_dict=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "ulalo_outbreak_predictor.joblib"
    joblib.dump(model, model_path)

    feature_importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    metrics = {
        "accuracy": round(accuracy, 4),
        "auc_roc": round(auc, 4),
        "sensitivity": round(report.get("1", {}).get("recall", 0), 4),
        "specificity": round(report.get("0", {}).get("recall", 0), 4),
        "feature_importance": feature_importance,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "threshold_percentile": 90,
        "best_model": type(model).__name__,
        "xgboost_auc": round(xgb_auc, 4),
        "random_forest_auc": round(rf_auc, 4),
        **cv_metrics,
    }

    metrics_path = output_dir / "ulalo_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("ULALO-AI model trained successfully")
    logger.info(f"  Accuracy: {accuracy:.4f}")
    logger.info(f"  AUC-ROC: {auc:.4f}")
    logger.info(
        f"  CV accuracy: {cv_metrics['cv_accuracy_mean']:.4f} +/- {cv_metrics['cv_accuracy_std']:.4f}"
    )
    logger.info(
        f"  CV AUC: {cv_metrics['cv_auc_mean']:.4f} +/- {cv_metrics['cv_auc_std']:.4f}"
    )
    logger.info(f"  Model saved to: {model_path}")

    return metrics


if __name__ == "__main__":
    from data.synthetic import generate_surveillance_data

    df = generate_surveillance_data(n_weeks=156, n_tas=5)
    output = Path("models/trained/ulalo")
    metrics = train(df, output)
    print(json.dumps(metrics, indent=2))
