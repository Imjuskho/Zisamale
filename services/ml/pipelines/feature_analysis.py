"""Feature importance analysis using sklearn permutation importance."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def compute_feature_importance(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    feature_names: list[str] | None = None,
    n_repeats: int = 10,
    random_state: int = 42,
    task: str = "binary",
) -> pd.DataFrame:
    if feature_names is None:
        feature_names = X.columns.tolist()

    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )

    result = permutation_importance(
        model,
        X_test,
        y_test,
        n_repeats=n_repeats,
        random_state=random_state,
        scoring="accuracy",
    )

    importance_df = (
        pd.DataFrame(
            {
                "feature": feature_names,
                "importance_mean": result.importances_mean,
                "importance_std": result.importances_std,
            }
        )
        .sort_values("importance_mean", ascending=False)
        .reset_index(drop=True)
    )

    return importance_df


def analyze_pipeline(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    feature_cols: list[str],
    pipeline_name: str,
    output_dir: Path,
    top_n: int = 10,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)

    imp_df = compute_feature_importance(
        model, X[feature_cols], y, feature_names=feature_cols
    )
    top_features = imp_df.head(top_n)

    csv_path = output_dir / f"feature_importance_{pipeline_name}.csv"
    imp_df.to_csv(csv_path, index=False)

    logger.info(f"\n=== {pipeline_name} Feature Importance (top {top_n}) ===")
    for _, row in top_features.iterrows():
        logger.info(
            f"  {row['feature']:30s}  {row['importance_mean']:.4f} +/- {row['importance_std']:.4f}"
        )

    return {
        "pipeline": pipeline_name,
        "top_features": top_features.to_dict(orient="records"),
        "all_features": imp_df.to_dict(orient="records"),
    }


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

    from sklearn.ensemble import GradientBoostingClassifier

    from data.synthetic import (
        generate_mama_data,
        generate_supply_data,
        generate_surveillance_data,
    )
    from pipelines.risk_scoring.train import FEATURE_COLS as MAMA_FEATURES
    from pipelines.risk_scoring.train import prepare_features
    from pipelines.supply_chain.train import FEATURE_COLS as SUPPLY_FEATURES
    from pipelines.supply_chain.train import engineer_features as supply_engineer
    from pipelines.surveillance.train import FEATURE_COLS as SURV_FEATURES
    from pipelines.surveillance.train import engineer_features

    output_dir = Path("models/feature_analysis")

    mama_df = generate_mama_data(n=500)
    X_mama, y_mama = prepare_features(mama_df)
    y_mama_enc = y_mama.map({"low": 0, "medium": 1, "high": 2, "critical": 3})
    model_mama = GradientBoostingClassifier(
        n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42
    )
    model_mama.fit(X_mama, y_mama_enc)
    analyze_pipeline(model_mama, X_mama, y_mama_enc, MAMA_FEATURES, "mama", output_dir)

    surv_df = generate_surveillance_data(n_weeks=104, n_tas=5)
    surv_feat = engineer_features(surv_df)
    X_surv = surv_feat[SURV_FEATURES]
    y_surv = surv_feat["outbreak"]
    model_surv = GradientBoostingClassifier(
        n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
    )
    model_surv.fit(X_surv, y_surv)
    analyze_pipeline(model_surv, X_surv, y_surv, SURV_FEATURES, "ulalo", output_dir)

    supply_df = generate_supply_data(n_facilities=10, n_months=24)
    supply_feat = supply_engineer(supply_df)
    X_supply = supply_feat[SUPPLY_FEATURES]
    y_supply = supply_feat["stockout_in_4_weeks"]
    model_supply = GradientBoostingClassifier(
        n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
    )
    model_supply.fit(X_supply, y_supply)
    analyze_pipeline(
        model_supply, X_supply, y_supply, SUPPLY_FEATURES, "chuma", output_dir
    )
