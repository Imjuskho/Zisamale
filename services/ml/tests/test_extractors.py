"""Tests for data extractors, quality gates, and feature engineering."""

from __future__ import annotations

import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest


# --- LMIS Extractor Tests ---

class TestLMISExtractor:
    def _make_client(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            yield LMISClient(cache_dir=Path(tmpdir))

    def test_synthetic_stock_levels(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            df = client.fetch_stock_levels(["F001", "F002", "F003"])
            assert len(df) > 0
            assert "facility_id" in df.columns
            assert "commodity" in df.columns
            assert "stock_on_hand" in df.columns

    def test_synthetic_order_history(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            df = client.fetch_orders(["F001", "F002"])
            assert len(df) > 0
            assert "order_date" in df.columns
            assert "lead_time_days" in df.columns

    def test_csv_parsing(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            csv_path = Path(tmpdir) / "test.csv"
            pd.DataFrame({
                "facility_id": ["F001", "F002"],
                "commodity": ["ACT", "ORS"],
                "stock_on_hand": [100, 200],
                "consumption_rate": [10, 15],
            }).to_csv(csv_path, index=False)

            df = client.parse_csv(csv_path)
            assert len(df) == 2
            assert "parsed_at" in df.columns

    def test_csv_missing_columns_raises(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            csv_path = Path(tmpdir) / "bad.csv"
            pd.DataFrame({"col_a": [1]}).to_csv(csv_path, index=False)
            with pytest.raises(ValueError, match="missing required columns"):
                client.parse_csv(csv_path)

    def test_stock_validation_detects_anomalies(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            df = pd.DataFrame({
                "facility_id": ["F001", "F002"],
                "commodity": ["ACT", "ACT"],
                "stock_on_hand": [-10, 100],
                "consumption_rate": [0, 10],
                "days_of_stock": [50, 3],
            })
            result = client.validate_stock_data(df)
            assert result["anomaly_count"] > 0
            types = [a["type"] for a in result["anomalies"]]
            assert "negative_stock" in types

    def test_csv_file_not_found(self):
        from data.extractors.lmis_extractor import LMISClient
        with tempfile.TemporaryDirectory() as tmpdir:
            client = LMISClient(cache_dir=Path(tmpdir))
            with pytest.raises(FileNotFoundError):
                client.parse_csv("/nonexistent/file.csv")


# --- Quality Gate Tests ---

class TestQualityGates:
    def test_completeness_check(self):
        from data.quality import check_completeness
        df = pd.DataFrame({
            "facility_id": ["F001"] * 50 + ["F002"] * 40,
            "epi_week": list(range(1, 51)) + list(range(1, 41)),
        })
        result = check_completeness(df, expected_weeks=52)
        assert "per_facility" in result
        assert result["per_facility"]["F001"]["completeness"] > result["per_facility"]["F002"]["completeness"]

    def test_completeness_missing_columns(self):
        from data.quality import check_completeness
        result = check_completeness(pd.DataFrame({"a": [1]}))
        assert "error" in result
        assert result["overall_pass"] is False

    def test_consistency_check(self):
        from data.quality import check_consistency
        df = pd.DataFrame({
            "facility_id": ["F001"] * 3,
            "year": [2023, 2024, 2025],
            "cases": [100, 120, 250],
        })
        result = check_consistency(df, tolerance=0.20)
        assert result["per_facility"]["F001"]["passed"] == False  # 108% jump

    def test_timeliness_check(self):
        from data.quality import check_timeliness
        from datetime import datetime, timedelta
        df = pd.DataFrame({
            "last_updated": [(datetime.utcnow() - timedelta(days=5)).isoformat()],
        })
        result = check_timeliness(df, max_lag_days=14)
        assert result["passed"] is True
        assert result["lag_days"] == 5

    def test_quality_gate_all_pass(self):
        from data.quality import quality_gate_check
        assert quality_gate_check(
            {"overall_pass": True, "overall_completeness": 0.98},
            {"overall_pass": True},
            {"passed": True, "lag_days": 3},
        ) is True

    def test_quality_gate_fails(self):
        from data.quality import quality_gate_check
        assert quality_gate_check(
            {"overall_pass": False},
            {"overall_pass": True},
            {"passed": True},
        ) is False

    def test_generate_quality_report(self):
        from data.quality import generate_quality_report
        report = generate_quality_report({
            "completeness": {"overall_completeness": 0.96, "overall_pass": True},
            "consistency": {"overall_pass": True},
            "timeliness": {"lag_days": 5, "max_allowed_lag_days": 14, "passed": True},
        })
        assert "PASS" in report
        assert "96" in report


# --- Feature Engineering Tests ---

class TestFeatureEngineering:
    def _sample_df(self, n=50):
        return pd.DataFrame({
            "facility_id": np.random.choice(["F001", "F002"], n),
            "epi_week": np.random.randint(1, 27, n),
            "cases": np.random.randint(0, 100, n),
            "population": np.random.randint(5000, 20000, n),
        })

    def test_lag_features(self):
        from data.feature_engineering import compute_lag_features
        df = self._sample_df()
        result = compute_lag_features(df, "cases", lags=[1, 2, 4])
        assert "cases_lag1" in result.columns
        assert "cases_lag2" in result.columns
        assert "cases_lag4" in result.columns

    def test_rolling_averages(self):
        from data.feature_engineering import compute_rolling_averages
        df = self._sample_df()
        result = compute_rolling_averages(df, "cases", windows=[4, 8])
        assert "cases_ma4" in result.columns
        assert "cases_ma8" in result.columns

    def test_seasonal_indicators(self):
        from data.feature_engineering import add_seasonal_indicators
        df = self._sample_df()
        result = add_seasonal_indicators(df)
        assert "season_sin" in result.columns
        assert "season_cos" in result.columns
        assert result["season_sin"].between(-1, 1).all()
        assert result["season_cos"].between(-1, 1).all()

    def test_normalize_by_population(self):
        from data.feature_engineering import normalize_by_population
        df = pd.DataFrame({
            "cases": [100, 200],
            "population": [10000, 20000],
        })
        result = normalize_by_population(df)
        assert "cases_per_10k" in result.columns
        assert result["cases_per_10k"].iloc[0] == 100.0

    def test_prepare_training_features(self):
        from data.feature_engineering import prepare_training_features
        df = self._sample_df()
        X, y = prepare_training_features(df, target_col="cases")
        assert len(X) == len(df)
        assert "cases" not in X.columns
        assert len(X.columns) > 0

    def test_full_pipeline(self):
        from data.feature_engineering import full_feature_pipeline
        df = self._sample_df(n=100)
        result = full_feature_pipeline(df)
        assert len(result) == len(df)
        assert "season_sin" in result.columns
        assert result.shape[1] > df.shape[1]  # more features after engineering
