"""Tests for Zisamale ML Pipelines."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.synthetic import generate_mama_data, generate_supply_data, generate_surveillance_data
from pipelines.bias_audit import audit_model_fairness
from pipelines.model_monitoring import (
    compute_concept_drift,
    compute_data_drift,
    detect_drift,
    generate_drift_report,
)
from pipelines.risk_scoring.train import LABEL_MAP, prepare_features, train as train_mama
from pipelines.surveillance.train import engineer_features, train as train_ulalo
from pipelines.supply_chain.train import train as train_chuma


class TestSyntheticData:
    def test_generate_mama_data(self):
        df = generate_mama_data(n=100)
        assert len(df) == 100
        assert "age" in df.columns
        assert "risk_category" in df.columns
        assert df["age"].between(15, 44).all()
        assert df["risk_score"].between(0, 10).all()

    def test_generate_surveillance_data(self):
        df = generate_surveillance_data(n_weeks=52, n_tas=3)
        assert len(df) == 52 * 3
        assert "confirmed_cases" in df.columns
        assert "rainfall_mm" in df.columns
        assert (df["confirmed_cases"] >= 0).all()

    def test_generate_supply_data(self):
        df = generate_supply_data(n_facilities=5, n_months=12)
        assert len(df) == 5 * 12
        assert "stock_on_hand" in df.columns
        assert "stockout_occurred" in df.columns


class TestMAMAPipeline:
    def test_prepare_features(self):
        df = generate_mama_data(n=50)
        X, y = prepare_features(df)
        assert len(X) == 50
        assert len(y) == 50
        assert all(col in X.columns for col in ["age", "parity", "hemoglobin"])

    def test_train_and_metrics(self, tmp_path):
        df = generate_mama_data(n=200)
        metrics = train_mama(df, tmp_path / "mama")
        assert "accuracy" in metrics
        assert "auc_roc_weighted" in metrics
        assert 0 <= metrics["accuracy"] <= 1
        assert 0 <= metrics["auc_roc_weighted"] <= 1
        assert (tmp_path / "mama" / "mama_risk_scorer.joblib").exists()
        assert (tmp_path / "mama" / "mama_metrics.json").exists()


class TestULALOPipeline:
    def test_engineer_features(self):
        df = generate_surveillance_data(n_weeks=52, n_tas=3)
        featured = engineer_features(df)
        assert "cases_lag1" in featured.columns
        assert "outbreak" in featured.columns
        assert featured["outbreak"].isin([0, 1]).all()

    def test_train_and_metrics(self, tmp_path):
        df = generate_surveillance_data(n_weeks=104, n_tas=5)
        metrics = train_ulalo(df, tmp_path / "ulalo")
        assert "accuracy" in metrics
        assert "auc_roc" in metrics
        assert 0 <= metrics["accuracy"] <= 1
        assert (tmp_path / "ulalo" / "ulalo_outbreak_predictor.joblib").exists()


class TestCHUMAPipeline:
    def test_train_and_metrics(self, tmp_path):
        df = generate_supply_data(n_facilities=10, n_months=24)
        metrics = train_chuma(df, tmp_path / "chuma")
        assert "accuracy" in metrics
        assert "auc_roc" in metrics
        assert 0 <= metrics["accuracy"] <= 1
        assert (tmp_path / "chuma" / "chuma_stockout_predictor.joblib").exists()


class TestXGBoostModels:
    def test_mama_uses_xgboost_and_trains(self, tmp_path):
        from xgboost import XGBClassifier

        import joblib

        df = generate_mama_data(n=200)
        metrics = train_mama(df, tmp_path / "mama")
        assert "cv_auc_mean" in metrics
        assert "cv_auc_std" in metrics
        assert "temporal_cv_auc" in metrics
        model = joblib.load(tmp_path / "mama" / "mama_risk_scorer.joblib")
        assert isinstance(model, XGBClassifier)

    def test_ulalo_xgboost_comparison(self, tmp_path):
        df = generate_surveillance_data(n_weeks=104, n_tas=5)
        metrics = train_ulalo(df, tmp_path / "ulalo")
        assert "best_model" in metrics
        assert metrics["best_model"] in ("XGBClassifier", "RandomForestClassifier")
        assert "xgboost_auc" in metrics
        assert "random_forest_auc" in metrics

    def test_chuma_xgboost_trains(self, tmp_path):
        from xgboost import XGBClassifier

        import joblib

        df = generate_supply_data(n_facilities=10, n_months=24)
        metrics = train_chuma(df, tmp_path / "chuma")
        model = joblib.load(tmp_path / "chuma" / "chuma_stockout_predictor.joblib")
        assert isinstance(model, XGBClassifier)
        assert "cv_auc_mean" in metrics


class TestBiasAudit:
    def _make_fitted_model(self):
        from sklearn.ensemble import RandomForestClassifier

        df = generate_mama_data(n=300)
        X, y = prepare_features(df)
        y_encoded = y.map(LABEL_MAP)
        model = RandomForestClassifier(n_estimators=50, random_state=42)
        model.fit(X, y_encoded)
        return model, X, y_encoded.to_numpy()

    def test_audit_returns_expected_structure(self):
        model, X, y = self._make_fitted_model()
        rng = np.random.default_rng(42)
        sensitive_features = {
            "district": rng.choice(["north", "south"], size=len(y)),
            "age_group": rng.choice(["youth", "adult"], size=len(y)),
        }
        report = audit_model_fairness(model, X, y, sensitive_features)

        assert set(report.keys()) == {
            "overall_metrics",
            "subgroup_analysis",
            "fairness_flags",
            "recommendation",
        }
        assert "auc_roc" in report["overall_metrics"]
        assert 0 <= report["overall_metrics"]["auc_roc"] <= 1
        for feature_name, sub_report in report["subgroup_analysis"].items():
            assert feature_name in sensitive_features
            assert "group_aucs" in sub_report
            assert "disparate_impact_ratio" in sub_report
            assert isinstance(sub_report["passed"], bool)
            assert len(sub_report["group_aucs"]) == 2
        assert isinstance(report["fairness_flags"], list)
        assert all(f in sensitive_features for f in report["fairness_flags"])
        assert isinstance(report["recommendation"], str) and report["recommendation"]

    def test_audit_flags_biased_feature(self):
        """A model that ranks well only for one subgroup should be flagged."""
        rng = np.random.default_rng(42)
        n = 200
        y = rng.integers(0, 2, size=n)
        groups = np.full(n, "a", dtype=object)
        groups[: n // 2] = "b"

        class BiasedModel:
            classes_ = np.array([0, 1])

            def predict_proba(self, X):
                good_signal = 0.9 * y + 0.05              # strong ranking for group "a"
                noise = rng.uniform(0.2, 0.8, size=n)     # chance-level for group "b"
                p1 = np.where(groups == "a", good_signal, noise)
                return np.column_stack([1 - p1, p1])

        report = audit_model_fairness(BiasedModel(), None, y, {"group": groups})
        assert "group" in report["subgroup_analysis"]
        assert not report["subgroup_analysis"]["group"]["passed"]
        assert "group" in report["fairness_flags"]
        assert report["subgroup_analysis"]["group"]["disparate_impact_ratio"] < 0.9


class TestModelMonitoring:
    def test_drift_detection(self):
        rng = np.random.default_rng(42)
        reference = rng.normal(0, 1, size=(500, 2))
        current = np.column_stack([
            rng.normal(3, 1, size=500),  # drifted
            rng.normal(0, 1, size=500),  # stable
        ])
        feature_names = ["drifted_feature", "stable_feature"]

        scores = compute_data_drift(reference, current, feature_names)
        assert set(scores.keys()) == set(feature_names)
        for s in scores.values():
            assert {"ks_statistic", "ks_pvalue", "kl_divergence"} == set(s.keys())
        assert scores["drifted_feature"]["kl_divergence"] > scores["stable_feature"]["kl_divergence"]

        drifted = detect_drift(scores, threshold=0.1)
        assert "drifted_feature" in drifted
        assert "stable_feature" not in drifted

    def test_concept_drift(self):
        rng = np.random.default_rng(42)
        n = 200
        predictions = np.concatenate([
            np.ones(100, dtype=int),   # perfect early period
            np.zeros(100, dtype=int),  # inverted later period
        ])
        actuals = np.ones(n, dtype=int)
        windows = compute_concept_drift(predictions, actuals, window_size=50)

        assert len(windows) == n - 50 + 1
        first_acc = windows[0]["accuracy"]
        last_acc = windows[-1]["accuracy"]
        assert first_acc > last_acc
        assert 0 <= first_acc <= 1 and 0 <= last_acc <= 1

    def test_generate_drift_report(self):
        rng = np.random.default_rng(7)
        reference = rng.normal(0, 1, size=(400, 3))
        current = rng.normal(5, 1, size=(400, 3))
        report = generate_drift_report(reference, current, ["f1", "f2", "f3"])

        assert set(report.keys()) == {
            "drift_metrics",
            "drifted_features",
            "n_features_monitored",
            "n_features_drifted",
            "recommendation",
        }
        assert report["n_features_monitored"] == 3
        assert report["n_features_drifted"] == 3
        assert set(report["drifted_features"]) == {"f1", "f2", "f3"}
        assert "retraining" in report["recommendation"].lower()
