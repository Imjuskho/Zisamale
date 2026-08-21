"""Model export: ONNX format and JSON metadata serialization."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def export_onnx(
    model,
    feature_names: list[str],
    output_path: Path,
    n_features: int | None = None,
) -> Path:
    if n_features is None:
        n_features = len(feature_names)

    initial_type = [("float_input", FloatTensorType([None, n_features]))]

    options = {}
    if hasattr(model, "n_classes_") and model.n_classes_ > 2:
        options = {id(model): {"zipmap": "columns"}}

    onnx_model = convert_sklearn(model, initial_types=initial_type, options=options if options else None)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    logger.info(f"ONNX model exported to {output_path}")
    return output_path


def export_metadata(
    model_name: str,
    version: str,
    metrics: dict,
    feature_names: list[str],
    training_data_info: dict,
    output_path: Path,
    additional: dict | None = None,
) -> Path:
    metadata = {
        "model_name": model_name,
        "version": version,
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "feature_names": feature_names,
        "training_data_info": training_data_info,
    }
    if additional:
        metadata.update(additional)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    logger.info(f"Model metadata exported to {output_path}")
    return output_path


def export_pipeline(
    model,
    model_name: str,
    version: str,
    feature_names: list[str],
    metrics: dict,
    training_data_info: dict,
    output_dir: Path,
    X_sample: pd.DataFrame | None = None,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)

    onnx_path = output_dir / f"{model_name}.onnx"
    if X_sample is not None:
        n_features = X_sample.shape[1]
        export_onnx(model, feature_names, onnx_path, n_features=n_features)
    else:
        export_onnx(model, feature_names, onnx_path, n_features=len(feature_names))

    joblib_path = output_dir / f"{model_name}.joblib"
    joblib.dump(model, joblib_path)

    meta_path = output_dir / f"{model_name}_metadata.json"
    export_metadata(model_name, version, metrics, feature_names, training_data_info, meta_path)

    return {
        "onnx_path": str(onnx_path),
        "joblib_path": str(joblib_path),
        "metadata_path": str(meta_path),
    }


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

    from sklearn.ensemble import GradientBoostingClassifier

    from data.synthetic import generate_mama_data
    from pipelines.risk_scoring.train import FEATURE_COLS as MAMA_FEATURES, prepare_features

    df = generate_mama_data(n=500)
    X, y = prepare_features(df)
    y_enc = y.map({"low": 0, "medium": 1, "high": 2, "critical": 3})

    model = GradientBoostingClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
    model.fit(X, y_enc)

    result = export_pipeline(
        model=model,
        model_name="mama_risk_scorer",
        version="1.0.0",
        feature_names=MAMA_FEATURES,
        metrics={"accuracy": 0.85},
        training_data_info={"n_samples": len(X), "n_features": len(MAMA_FEATURES)},
        output_dir=Path("models/exports"),
        X_sample=X,
    )

    print(json.dumps(result, indent=2))
