"""Model comparison: GradientBoosting vs RandomForest vs LogisticRegression."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS = {
    "GradientBoosting": lambda: GradientBoostingClassifier(
        n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
    ),
    "RandomForest": lambda: RandomForestClassifier(
        n_estimators=100, max_depth=8, random_state=42
    ),
    "LogisticRegression": lambda: LogisticRegression(max_iter=1000, random_state=42),
}


def compare_models(
    X: pd.DataFrame,
    y: pd.Series,
    task: str = "binary",
    n_folds: int = 5,
) -> pd.DataFrame:
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    results = []

    for name, model_fn in MODELS.items():
        acc_folds = []
        auc_folds = []

        for train_idx, val_idx in skf.split(X, y):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            clf = model_fn()
            try:
                clf.fit(X_train, y_train)
            except Exception as e:  # noqa: BLE001
                logger.warning(f"{name} failed on fold: {e}")
                continue

            y_pred = clf.predict(X_val)
            acc_folds.append(accuracy_score(y_val, y_pred))

            try:
                if task == "binary":
                    y_proba = clf.predict_proba(X_val)[:, 1]
                else:
                    y_proba = clf.predict_proba(X_val)
                    auc_folds.append(
                        roc_auc_score(
                            y_val, y_proba, multi_class="ovr", average="weighted"
                        )
                    )
                    continue
                auc_folds.append(roc_auc_score(y_val, y_proba))
            except ValueError:
                auc_folds.append(0.0)

        results.append(
            {
                "model": name,
                "accuracy_mean": round(float(pd.Series(acc_folds).mean()), 4),
                "accuracy_std": round(float(pd.Series(acc_folds).std()), 4),
                "auc_mean": round(float(pd.Series(auc_folds).mean()), 4)
                if auc_folds
                else 0.0,
                "auc_std": round(float(pd.Series(auc_folds).std()), 4)
                if auc_folds
                else 0.0,
            }
        )

    return pd.DataFrame(results)


def run_comparison(
    datasets: dict[str, tuple[pd.DataFrame, pd.Series, str]],
    output_dir: Path,
) -> dict[str, pd.DataFrame]:
    output_dir.mkdir(parents=True, exist_ok=True)
    all_results = {}

    for name, (X, y, task) in datasets.items():
        logger.info(f"Comparing models on {name}...")
        df = compare_models(X, y, task=task)
        all_results[name] = df

        csv_path = output_dir / f"comparison_{name}.csv"
        df.to_csv(csv_path, index=False)
        logger.info(f"  Results saved to {csv_path}")
        print(f"\n=== {name} ===")
        print(df.to_string(index=False))

    return all_results


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

    from data.synthetic import (
        generate_mama_data,
        generate_supply_data,
        generate_surveillance_data,
    )
    from pipelines.risk_scoring.train import prepare_features
    from pipelines.supply_chain.train import engineer_features as supply_engineer
    from pipelines.surveillance.train import engineer_features

    mama_df = generate_mama_data(n=500)
    X_mama, y_mama = prepare_features(mama_df)
    y_mama_enc = y_mama.map({"low": 0, "medium": 1, "high": 2, "critical": 3})

    surv_df = generate_surveillance_data(n_weeks=104, n_tas=5)
    surv_feat = engineer_features(surv_df)
    X_surv = surv_feat[
        [
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
    ]
    y_surv = surv_feat["outbreak"]

    supply_df = generate_supply_data(n_facilities=10, n_months=24)
    supply_feat = supply_engineer(supply_df)
    X_supply = supply_feat[
        [
            "stock_on_hand",
            "monthly_consumption",
            "months_of_supply",
            "lead_time_days",
            "consumption_trend",
            "consumption_volatility",
            "seasonal_factor",
        ]
    ]
    y_supply = supply_feat["stockout_in_4_weeks"]

    datasets = {
        "mama_risk_scoring": (X_mama, y_mama_enc, "multiclass"),
        "ulalo_surveillance": (X_surv, y_surv, "binary"),
        "chuma_supply_chain": (X_supply, y_supply, "binary"),
    }

    run_comparison(datasets, Path("models/comparison"))
