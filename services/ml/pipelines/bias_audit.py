"""Model fairness auditing for Malawi health AI."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import roc_auc_score


def _safe_auc(y_true: np.ndarray, y_proba: np.ndarray) -> float | None:
    """Compute AUC, returning None when the subset is degenerate."""
    if len(np.unique(y_true)) < 2:
        return None
    try:
        return float(roc_auc_score(y_true, y_proba))
    except ValueError:
        return None


def audit_model_fairness(
    model,
    X_test,
    y_test: np.ndarray,
    sensitive_features: dict[str, np.ndarray],
) -> dict:
    """Audit model fairness across subgroups.

    Args:
        model: trained classifier with predict_proba
        X_test: feature matrix
        y_test: true labels
        sensitive_features: dict mapping feature_name -> array of subgroup labels

    Returns:
        dict with overall metrics, per-subgroup metrics, and fairness flags
    """
    y_test = np.asarray(y_test)
    y_proba = model.predict_proba(X_test)

    # Overall AUC: one-vs-rest AUC per class then average (binary uses single column)
    if y_proba.shape[1] == 2:
        overall_auc = _safe_auc(y_test, y_proba[:, 1])
    else:
        classes = np.asarray(model.classes_)
        class_aucs = []
        for i in range(y_proba.shape[1]):
            auc_i = _safe_auc((y_test == classes[i]).astype(int), y_proba[:, i])
            if auc_i is not None:
                class_aucs.append(auc_i)
        overall_auc = float(np.mean(class_aucs)) if class_aucs else None

    # Per-subgroup analysis
    subgroup_reports = {}
    for feature_name, subgroups in sensitive_features.items():
        subgroups = np.asarray(subgroups)
        unique_groups = np.unique(subgroups)
        group_aucs = {}
        for group in unique_groups:
            mask = subgroups == group
            if mask.sum() < 10:
                continue
            # compute AUC for this subgroup
            if y_proba.shape[1] == 2:
                group_auc = _safe_auc(y_test[mask], y_proba[mask, 1])
            else:
                classes = np.asarray(model.classes_)
                class_aucs = []
                for i in range(y_proba.shape[1]):
                    auc_i = _safe_auc(
                        (y_test[mask] == classes[i]).astype(int), y_proba[mask, i]
                    )
                    if auc_i is not None:
                        class_aucs.append(auc_i)
                group_auc = float(np.mean(class_aucs)) if class_aucs else None

            if group_auc is not None:
                group_aucs[str(group)] = round(group_auc, 4)

        # Compute disparate impact ratio
        if len(group_aucs) >= 2:
            aucs = list(group_aucs.values())
            max_auc = max(aucs)
            min_auc = min(aucs)
            disparate_impact = min_auc / max_auc if max_auc > 0 else 0
        else:
            disparate_impact = 1.0

        subgroup_reports[feature_name] = {
            "group_aucs": group_aucs,
            "disparate_impact_ratio": round(disparate_impact, 4),
            "passed": disparate_impact >= 0.9,  # 90% parity threshold
        }

    # Generate report
    fairness_flags = [name for name, r in subgroup_reports.items() if not r["passed"]]
    if not subgroup_reports:
        recommendation = (
            "No auditable subgroups found; provide sensitive features with "
            "at least two groups of >=10 samples each."
        )
    elif fairness_flags:
        recommendation = (
            f"Fairness review required: {', '.join(fairness_flags)} show(s) "
            "subgroup performance disparity below the 90% parity threshold. "
            "Investigate data representation and consider reweighting or "
            "retraining before deployment."
        )
    else:
        recommendation = (
            "All audited subgroups meet the 90% parity threshold; "
            "model is cleared for equitable deployment."
        )

    report = {
        "overall_metrics": {
            "auc_roc": round(overall_auc, 4) if overall_auc is not None else None,
            "n_samples": int(len(y_test)),
        },
        "subgroup_analysis": subgroup_reports,
        "fairness_flags": fairness_flags,
        "recommendation": recommendation,
    }
    return report
