"""Community operations models backing the MOYO map layers.

Citizen-reported pins, maternity waiting homes, traditional birth
attendants, vaccine cold-chain units, and supply trucks — the
operational datasets rendered by the map layer toggles.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CommunityPin(Base):
    __tablename__ = "community_pins"

    pin_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    pin_type: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    village: Mapped[str | None] = mapped_column(String(100))
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    verified_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaternityWaitingHome(Base):
    __tablename__ = "maternity_waiting_homes"

    mwh_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    linked_facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    occupied: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")


class TraditionalBirthAttendant(Base):
    __tablename__ = "traditional_birth_attendants"

    tba_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    village: Mapped[str | None] = mapped_column(String(100))
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    linked_facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    registered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class SupplyTruck(Base):
    __tablename__ = "supply_trucks"

    truck_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    driver_name: Mapped[str] = mapped_column(String(150), nullable=False)
    cargo: Mapped[str] = mapped_column(String(200), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    heading: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    eta_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    temperature_breach: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_update: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ColdChainUnit(Base):
    __tablename__ = "cold_chain_units"

    unit_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    fridge_status: Mapped[str] = mapped_column(String(20), nullable=False, default="working")
    last_temperature: Mapped[float | None] = mapped_column(Float)
    solar_powered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_reading_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
