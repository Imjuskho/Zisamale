"""Single alert emission point.

Every alert in the system is created through :func:`emit_alert`, which owns:

- the canonical risk scale (0–1) — previously chw_sync stored 0–1 while the
  DHIS2 threshold path stored 0–10, so ``ORDER BY risk_score`` mixed units
- deterministic ids when an idempotency key is given — replays update the
  existing row instead of stacking duplicates
- level derivation from risk when the caller has no external level
- post-commit fan-out through :class:`AlertDeliveryService` via
  :func:`dispatch_alert` — best-effort, never raises into the request path
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.alerts.delivery import AlertDeliveryService, alert_to_dict
from app.models.alert import Alert

logger = logging.getLogger(__name__)

NAMESPACE = uuid.NAMESPACE_URL


def normalize_risk(value: float, *, scale: float = 1.0) -> float:
    """Clamp any source scale onto the canonical 0–1 storage scale."""
    if scale <= 0:
        raise ValueError("scale must be positive")
    normalized = float(value) / scale
    return round(min(1.0, max(0.0, normalized)), 4)


def level_for_risk(risk01: float) -> str:
    if risk01 >= 0.75:
        return "red"
    if risk01 >= 0.45:
        return "amber"
    return "green"


_delivery: AlertDeliveryService | None = None


def get_delivery_service() -> AlertDeliveryService:
    global _delivery  # noqa: PLW0603
    if _delivery is None:
        _delivery = AlertDeliveryService()
    return _delivery


async def emit_alert(
    db: AsyncSession,
    *,
    disease: str,
    risk_score: float,
    scale: float = 1.0,
    alert_level: str | None = None,
    district_id: str | None = None,
    ta_id: str | None = None,
    ta_name: str | None = None,
    predicted_cases: int | None = None,
    ci_lower: int | None = None,
    ci_upper: int | None = None,
    recommended_actions: list[str] | None = None,
    model_version: str | None = None,
    generated_at: datetime | None = None,
    status: str = "pending",
    idempotency_key: str | None = None,
) -> tuple[Alert, bool]:
    """Create (or idempotently refresh) one alert on the canonical scale."""
    risk01 = normalize_risk(risk_score, scale=scale)
    level = alert_level or level_for_risk(risk01)
    actions = list(recommended_actions or [])
    # Naive UTC — the alerts table stores timestamp without time zone.
    generated = generated_at or datetime.utcnow()

    if idempotency_key:
        alert_id = str(uuid.uuid5(NAMESPACE, f"zisamale:{idempotency_key}"))
        found = await db.execute(select(Alert).where(Alert.alert_id == alert_id))
        existing = found.scalar_one_or_none()
        if existing is not None:
            existing.risk_score = risk01
            existing.alert_level = level
            existing.predicted_cases = predicted_cases
            existing.recommended_actions = actions
            return existing, False
    else:
        alert_id = str(uuid.uuid4())

    alert = Alert(
        alert_id=alert_id,
        disease=disease,
        district_id=district_id,
        ta_id=ta_id,
        ta_name=ta_name,
        risk_score=risk01,
        alert_level=level,
        predicted_cases=predicted_cases,
        confidence_interval_lower=ci_lower,
        confidence_interval_upper=ci_upper,
        recommended_actions=actions,
        model_version=model_version,
        generated_at=generated,
        status=status,
    )
    db.add(alert)
    return alert, True


async def dispatch_alert(alert: Alert, channels: list[str] | None = None) -> None:
    """Fan out after commit; failures are logged, never raised."""
    try:
        await get_delivery_service().deliver_alert(
            alert_to_dict(alert), channels or ["websocket"]
        )
    except Exception:  # noqa: BLE001 — delivery must not break ingest
        logger.warning("alert.dispatch_failed", exc_info=True, extra={
            "alert_id": getattr(alert, "alert_id", None),
        })
