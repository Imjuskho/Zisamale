from __future__ import annotations

from sqlalchemy import Boolean, Date, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Commodity(Base):
    __tablename__ = "commodities"

    commodity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    is_essential: Mapped[bool] = mapped_column(Boolean, default=True)
    min_stock_months: Mapped[float] = mapped_column(Float, default=2.0)


class FacilityStock(Base):
    __tablename__ = "facility_stock"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    commodity_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    stock_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    monthly_consumption: Mapped[float] = mapped_column(Float, default=0.0)
    last_restocked_date: Mapped[str | None] = mapped_column(Date)
    stockout_risk_score: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[str] = mapped_column(String, nullable=False)


class StockoutHistory(Base):
    __tablename__ = "stockout_history"

    stockout_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    commodity_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    stockout_date: Mapped[str] = mapped_column(Date, nullable=False)
    restocked_date: Mapped[str | None] = mapped_column(Date)
    duration_days: Mapped[int | None] = mapped_column(Integer)
