"""Train MAMA-AI / CHUMA-AI edge risk models (M3).

Produces compact gradient-boosted tree ensembles that run on-device in the
Android app with ZERO third-party runtime dependencies:

  apps/android/app/src/main/assets/models/risk_pregnancy_v{V}.zgb
  apps/android/app/src/main/assets/models/risk_child_v{V}.zgb
  .../assets/models/golden_pregnancy_v{V}.txt      (host/device parity vectors)
  .../assets/models/golden_child_v{V}.txt

Plus ONNX exports + evaluation report under services/ml/models/.

Label provenance (honest): v1/v3 models are trained on synthetic cohorts whose
targets follow the Malawi clinical protocol weights encoded in the app's
RiskScorer/EdgeAI rules (plus noise, seasonality and facility effects for the
pregnancy cohort). This is a cold-start model; it must be retrained on real,
consented outcome data before any autonomous use (Principle 3: human-in-loop).

Feature contracts are owned by the Android `EdgeAI` object:

  Pregnancy (10 floats): ageYears, parity, priorStillbirths, priorCsections,
                         bpSystolic, bpDiastolic, hemoglobin, foodSecurity(1-5),
                         distanceKm, hivPositive(0/1)
  Child     (7 floats):  ageMonths, muac(cm), weightKg, heightCm,
                         fever(0/1), cough(0/1), diarrhea(0/1)
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from data.synthetic import generate_mama_data

REPO_ROOT = Path(__file__).resolve().parents[3]
ASSETS_DIR = REPO_ROOT / "apps/android/app/src/main/assets/models"
MODELS_DIR = REPO_ROOT / "services/ml/models"

MODEL_VERSION = 3

# ---------------------------------------------------------------- data -------


def pregnancy_dataset(n: int = 8000, seed: int = 42):
    """Synthetic ANC cohort matching the Android feature contract exactly."""
    df = generate_mama_data(n=n, seed=seed)
    rng = np.random.default_rng(seed)
    hiv = rng.random(n) < 0.10
    # Keep target consistent with the protocol weight (+1.5 for HIV+) used by
    # the on-device rule fallback so model and fallback stay aligned.
    y = np.clip(df["risk_score"].to_numpy() + hiv * 1.5 + rng.normal(0, 0.2, n), 0, 10)
    X = np.column_stack(
        [
            df["age"].to_numpy(),
            df["parity"].to_numpy(),
            df["prior_stillbirths"].to_numpy(),
            df["prior_csections"].to_numpy(),
            df["bp_systolic"].to_numpy(),
            df["bp_diastolic"].to_numpy(),
            df["hemoglobin"].to_numpy(),
            df["food_security_score"].to_numpy(),
            df["distance_to_facility_km"].to_numpy(),
            hiv.astype(float),
        ]
    ).astype(np.float64)
    return X, y


def child_dataset(n: int = 6000, seed: int = 7):
    """Synthetic sick-child cohort (IMCI-flavoured targets).

    No child generator existed in data/synthetic.py; this cohort follows the
    same protocol weights as EdgeAI.childContributions plus smooth severity
    gradients so the GBT learns beyond hard thresholds.
    """
    rng = np.random.default_rng(seed)
    age_months = rng.integers(1, 60, size=n).astype(float)
    muac = rng.normal(14.2, 1.8, size=n).clip(9.5, 17.5)
    fever = (rng.random(n) < 0.35).astype(float)
    cough = (rng.random(n) < 0.30).astype(float)
    diarrhea = (rng.random(n) < 0.25).astype(float)

    # Rough weight-for-age band (kg) around WHO medians with wide spread.
    median_wfa = 2.5 + age_months * 0.32
    weight_kg = (median_wfa * rng.normal(1.0, 0.18, size=n)).clip(1.8, 25.0)
    # Height tracks age with malnutrition-linked compression.
    median_lfa = 50 + age_months * 1.6
    height_cm = (median_lfa * rng.normal(1.0, 0.08, size=n)).clip(40, 120)

    wastedness = np.clip((13.5 - muac) * 0.45, 0, None)
    underweight = np.clip((median_wfa * 0.75 - weight_kg) * 0.25, 0, None)
    stunting = np.clip((median_lfa * 0.88 - height_cm) * 0.03, 0, None)
    infant = (age_months < 6).astype(float)

    risk = np.zeros(n)
    risk += (muac < 11.5) * 3.0
    risk += ((muac >= 11.5) & (muac < 12.5)) * 1.5
    risk += wastedness
    risk += fever * 1.0
    risk += cough * diarrhea * 1.5
    risk += diarrhea * 0.8
    risk += infant * 0.5
    risk += (weight_kg < 2.5) * 2.0
    risk += underweight
    risk += stunting
    y = np.clip(risk + rng.normal(0, 0.4, n), 0, 10)

    X = np.column_stack([age_months, muac, weight_kg, height_cm, fever, cough, diarrhea]).astype(
        np.float64
    )
    return X, y


# ------------------------------------------------------------- train/export --


def fit_gbt(X, y, seed: int = 42) -> GradientBoostingRegressor:
    model = GradientBoostingRegressor(
        n_estimators=80,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.9,
        min_samples_leaf=20,
        random_state=seed,
        loss="squared_error",
    )
    model.fit(X, y)
    return model


def export_zgb(model, path: Path, kind: str, feature_count: int) -> dict:
    """Write the ensemble as plain text (exact float round-trip, no deps)."""
    f0 = float(np.asarray(model.init_.constant_).ravel()[0])
    lines = [
        f"zisamale-tree-ensemble {MODEL_VERSION} {kind} {feature_count}",
        f"learning_rate {model.learning_rate!r}",
        f"init {f0!r}",
        f"trees {len(model.estimators_)}",
    ]
    for est in model.estimators_.ravel():
        tree = est.tree_
        values = tree.value.ravel()
        lines.append(f"tree {tree.node_count}")
        for i in range(tree.node_count):
            is_leaf = tree.children_left[i] == -1
            feat = -1 if is_leaf else int(tree.feature[i])
            thr = repr(float(tree.threshold[i]))
            left = int(tree.children_left[i])
            right = int(tree.children_right[i])
            lines.append(f"{feat} {thr} {left} {right} {float(values[i])!r}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n")
    return {"init": f0, "learning_rate": model.learning_rate, "n_trees": len(model.estimators_)}


def eval_zgb_file(path: Path, X: np.ndarray) -> np.ndarray:
    """Reference re-implementation used to prove the exported file is exact."""
    lines = path.read_text().splitlines()
    f0 = float(lines[2].split()[1])
    n_trees = int(lines[3].split()[1])
    idx = 4
    out = np.full(len(X), f0)
    for _ in range(n_trees):
        node_count = int(lines[idx].split()[1])
        idx += 1
        feat = np.empty(node_count, dtype=int)
        thr = np.empty(node_count)
        left = np.empty(node_count, dtype=int)
        right = np.empty(node_count, dtype=int)
        value = np.empty(node_count)
        for node in range(node_count):
            parts = lines[idx].split()
            idx += 1
            feat[node], left[node], right[node] = int(parts[0]), int(parts[2]), int(parts[3])
            thr[node], value[node] = float(parts[1]), float(parts[4])
        for i, row in enumerate(X):
            node = 0
            while feat[node] != -1:
                node = left[node] if row[feat[node]] <= thr[node] else right[node]
            out[i] += lr_of(lines) * value[node]
    return out


def lr_of(lines: list[str]) -> float:
    return float(lines[1].split()[1])


def write_goldens(path: Path, X: np.ndarray, scores: np.ndarray, count: int = 60) -> None:
    sel = slice(0, count)
    rows = []
    for x, s in zip(X[sel], scores[sel]):
        rows.append(" ".join(repr(float(v)) for v in [*x, float(s)]))
    path.write_text("\n".join(rows) + "\n")


def export_onnx(model, path: Path, feature_count: int) -> float | None:
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType

        onnx_model = convert_sklearn(
            model,
            initial_types=[("float_input", FloatTensorType([None, feature_count]))],
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(onnx_model.SerializeToString())
        return len(path.read_bytes())
    except Exception as exc:  # pragma: no cover - optional artifact
        print(f"  ONNX export skipped: {exc}")
        return None


def category_of(score: float) -> str:
    if score <= 3.0:
        return "low"
    if score <= 6.0:
        return "medium"
    if score <= 8.0:
        return "high"
    return "critical"


def train_one(kind: str, X, y) -> dict:
    print(f"[{kind}] n={len(y)}")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=1)
    t0 = time.perf_counter()
    model = fit_gbt(X_train, y_train)
    fit_s = time.perf_counter() - t0

    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    r2 = r2_score(y_test, pred)

    cat_agree = float(
        np.mean([category_of(p) == category_of(t) for p, t in zip(pred, y_test)])
    )

    # Export + prove the exported artifact reproduces sklearn exactly.
    zgb_path = ASSETS_DIR / f"risk_{kind}_v{MODEL_VERSION}.zgb"
    meta = export_zgb(model, zgb_path, kind, X.shape[1])

    sample = X_test[:64]
    sklearn_scores = model.predict(sample)
    ref_scores = eval_zgb_file(zgb_path, sample)
    max_export_err = float(np.max(np.abs(sklearn_scores - ref_scores)))

    golden_path = ASSETS_DIR / f"golden_{kind}_v{MODEL_VERSION}.txt"
    write_goldens(golden_path, X_test, sklearn_scores)

    onnx_size = export_onnx(model, MODELS_DIR / f"risk_{kind}_v{MODEL_VERSION}.onnx", X.shape[1])

    report = {
        "kind": kind,
        "model_version": MODEL_VERSION,
        "n_train": len(y_train),
        "n_test": len(y_test),
        "fit_seconds": round(fit_s, 2),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "category_agreement": round(cat_agree, 4),
        "export_max_abs_error": max_export_err,
        "zgb_bytes": zgb_path.stat().st_size,
        "onnx_bytes": onnx_size,
        **meta,
    }
    print(
        f"  MAE={mae:.3f} RMSE={rmse:.3f} R2={r2:.3f} "
        f"catAgree={cat_agree:.1%} exportErr={max_export_err:.2e} zgb={report['zgb_bytes']}B"
    )
    return report


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    reports = []
    for kind, (X, y) in {
        "pregnancy": pregnancy_dataset(),
        "child": child_dataset(),
    }.items():
        reports.append(train_one(kind, X, y))

    report_path = MODELS_DIR / f"edge_v{MODEL_VERSION}_report.json"
    report_path.write_text(json.dumps({"models": reports}, indent=2))
    print(f"report -> {report_path}")

    total = sum(r["zgb_bytes"] for r in reports)
    assert total < 5 * 1024 * 1024, "bundled models must stay under 5MB combined"
    for r in reports:
        assert r["export_max_abs_error"] < 1e-9, "exported ensemble must match sklearn exactly"
    print(f"OK: bundled ensembles total {total} bytes (<5MB)")


if __name__ == "__main__":
    main()
