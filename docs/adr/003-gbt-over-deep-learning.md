# ADR-003: Gradient Boosting over Deep Learning for Risk Scoring

## Status
Accepted

## Context
MAMA-AI risk scoring must run on-device (TensorFlow Lite) with <100ms inference on low-end Android phones. The model must be interpretable for CHWs and clinicians.

## Decision
Use Gradient Boosted Trees (XGBoost/LightGBM) converted to ONNX/TensorFlow Lite for edge deployment. Reserve LSTM/deep learning for cloud-only exploration.

## Consequences
- **Positive**: Model size <5MB, inference <100ms on Snapdragon 680
- **Positive**: Built-in feature importance for explainability (top 3 factors)
- **Positive**: Works well with tabular data and limited training samples
- **Negative**: Less expressive than deep learning for complex temporal patterns
- **Mitigation**: Cloud models use ensemble approaches; edge model retrained periodically
