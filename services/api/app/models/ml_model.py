from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    model_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    engine: Mapped[str] = mapped_column(String(20), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    training_data_range: Mapped[str | None] = mapped_column(String(100))
    metrics: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    artifact_path: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
