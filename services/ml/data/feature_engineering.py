"""Production feature engineering for Malawi health data."""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_lag_features(
    df: pd.DataFrame,
    value_col: str,
    lags: list[int] | None = None,
    group_col: str = "facility_id",
) -> pd.DataFrame:
    lags = lags or [1, 2, 4, 8]
    df = df.sort_values(
        [group_col, "epi_week"] if "epi_week" in df.columns else [group_col]
    )
    for lag in lags:
        df[f"{value_col}_lag{lag}"] = df.groupby(group_col)[value_col].shift(lag)
    return df


def compute_rolling_averages(
    df: pd.DataFrame,
    value_col: str,
    windows: list[int] | None = None,
    group_col: str = "facility_id",
) -> pd.DataFrame:
    windows = windows or [4, 8, 12]
    df = df.sort_values(
        [group_col, "epi_week"] if "epi_week" in df.columns else [group_col]
    )
    for w in windows:
        df[f"{value_col}_ma{w}"] = df.groupby(group_col)[value_col].transform(
            lambda x, w=w: x.rolling(w, min_periods=1).mean()
        )
    return df


def add_seasonal_indicators(
    df: pd.DataFrame, week_col: str = "epi_week"
) -> pd.DataFrame:
    if week_col not in df.columns:
        df["season_sin"] = 0.0
        df["season_cos"] = 1.0
        return df

    week_num = df[week_col].astype(float)
    period = 52.0
    df["season_sin"] = np.sin(2 * np.pi * week_num / period)
    df["season_cos"] = np.cos(2 * np.pi * week_num / period)
    return df


def normalize_by_population(
    df: pd.DataFrame,
    cases_col: str = "cases",
    population_col: str = "population",
) -> pd.DataFrame:
    if cases_col in df.columns and population_col in df.columns:
        df[f"{cases_col}_per_10k"] = (
            df[cases_col] / df[population_col].clip(lower=1) * 10000
        ).round(2)
    return df


def prepare_training_features(
    df: pd.DataFrame,
    target_col: str,
    feature_cols: list[str] | None = None,
) -> tuple[pd.DataFrame, pd.Series]:
    if feature_cols is None:
        exclude = {
            target_col,
            "facility_id",
            "epi_week",
            "year",
            "district",
            "ta_name",
            "generated_at",
            "last_updated",
            "facility_name",
        }
        feature_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns if c not in exclude
        ]

    available = [c for c in feature_cols if c in df.columns]
    X = df[available].copy()
    y = df[target_col].copy()

    X = X.fillna(0)
    return X, y


def full_feature_pipeline(
    df: pd.DataFrame, target_col: str | None = None
) -> pd.DataFrame:
    df = df.copy()

    numeric_cols = [
        c
        for c in df.select_dtypes(include=[np.number]).columns
        if c not in ("epi_week", "year", "population")
    ]

    for col in numeric_cols[:3]:
        df = compute_lag_features(
            df,
            col,
            lags=[1, 2, 4],
            group_col="facility_id" if "facility_id" in df.columns else df.columns[0],
        )
        df = compute_rolling_averages(
            df,
            col,
            windows=[4, 8],
            group_col="facility_id" if "facility_id" in df.columns else df.columns[0],
        )

    df = add_seasonal_indicators(df)
    df = normalize_by_population(df)

    return df
