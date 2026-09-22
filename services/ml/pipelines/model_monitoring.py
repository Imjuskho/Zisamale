"""Production model monitoring for data drift and concept drift."""

from __future__ import annotations

import numpy as np
from scipy import stats


def compute_data_drift(
    reference_features: np.ndarray,
    current_features: np.ndarray,
    feature_names: list[str],
) -> dict:
    """Compute KL divergence between reference and current feature distributions.

    For each feature, computes a two-sample KS test (p-value) and KL
    divergence between binned histograms of the two distributions.

    Returns:
        dict mapping feature_name -> {"ks_statistic", "ks_pvalue", "kl_divergence"}
    """
    reference_features = np.asarray(reference_features, dtype=float)
    current_features = np.asarray(current_features, dtype=float)

    if reference_features.ndim == 1:
        reference_features = reference_features.reshape(-1, 1)
    if current_features.ndim == 1:
        current_features = current_features.reshape(-1, 1)

    drift_scores: dict = {}
    for i, name in enumerate(feature_names):
        ref_col = reference_features[:, i]
        cur_col = current_features[:, i]

        ks_stat, ks_pvalue = stats.ks_2samp(ref_col, cur_col)

        # Shared bins so both histograms are comparable
        combined_min = min(ref_col.min(), cur_col.min())
        combined_max = max(ref_col.max(), cur_col.max())
        if combined_max <= combined_min:
            kl_divergence = 0.0
        else:
            bins = np.linspace(combined_min, combined_max + 1e-12, 21)
            ref_hist, _ = np.histogram(ref_col, bins=bins)
            cur_hist, _ = np.histogram(cur_col, bins=bins)
            # Laplace smoothing to avoid division by zero / log(0)
            ref_probs = (ref_hist + 1) / (ref_hist.sum() + len(ref_hist))
            cur_probs = (cur_hist + 1) / (cur_hist.sum() + len(cur_hist))
            kl_divergence = float(stats.entropy(cur_probs, ref_probs))

        drift_scores[name] = {
            "ks_statistic": round(float(ks_stat), 4),
            "ks_pvalue": round(float(ks_pvalue), 6),
            "kl_divergence": round(kl_divergence, 4),
        }

    return drift_scores


def compute_concept_drift(
    predictions: np.ndarray,
    actuals: np.ndarray,
    window_size: int = 50,
) -> list[dict]:
    """Compute rolling accuracy to detect concept drift.

    Sliding window accuracy over time-ordered prediction/actual pairs.
    """
    predictions = np.asarray(predictions)
    actuals = np.asarray(actuals)

    n = len(predictions)
    if n == 0 or window_size <= 0 or window_size > n:
        return []

    windows = []
    for start in range(n - window_size + 1):
        end = start + window_size
        window_acc = float(np.mean(predictions[start:end] == actuals[start:end]))
        windows.append(
            {
                "window_start": int(start),
                "window_end": int(end),
                "accuracy": round(window_acc, 4),
            }
        )
    return windows


def detect_drift(drift_scores: dict, threshold: float = 0.1) -> list[str]:
    """Return list of features that have drifted beyond threshold."""
    drifted = []
    for feature_name, scores in drift_scores.items():
        if isinstance(scores, dict):
            score = scores.get("kl_divergence", 0.0)
        else:
            score = scores
        if score > threshold:
            drifted.append(feature_name)
    return drifted


def generate_drift_report(reference, current, feature_names) -> dict:
    """Full drift report with metrics and recommendations."""
    drift_scores = compute_data_drift(reference, current, feature_names)
    drifted_features = detect_drift(drift_scores)

    if not drifted_features:
        recommendation = (
            "No significant data drift detected; model retraining "
            "not required at this time."
        )
    elif len(drifted_features) < len(feature_names) / 2:
        recommendation = (
            f"Moderate drift detected in {len(drifted_features)} feature(s): "
            f"{', '.join(drifted_features)}. Schedule investigation and "
            "consider near-term retraining."
        )
    else:
        recommendation = (
            "Severe data drift detected across the majority of features. "
            "Immediate retraining on recent data is recommended."
        )

    report = {
        "drift_metrics": drift_scores,
        "drifted_features": drifted_features,
        "n_features_monitored": len(feature_names),
        "n_features_drifted": len(drifted_features),
        "recommendation": recommendation,
    }
    return report
