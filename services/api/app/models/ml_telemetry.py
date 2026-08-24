from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ModelTelemetry(Base):
    """Edge inference telemetry reported by the Android app (M3)."""

    __tablename__ = "model_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chw_id: Mapped[str | None] = mapped_column(String(64))
    device_id: Mapped[str | None] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(20))  # pregnancy | child
    model_version: Mapped[str] = mapped_column(String(50))
    source: Mapped[str] = mapped_column(String(20))  # bundled_model | rule_based
    inference_count: Mapped[int] = mapped_column(Integer, default=0)
    fallback_count: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms_avg: Mapped[float | None] = mapped_column(Float)
    app_version: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
