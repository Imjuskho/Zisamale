"""Seed the demo operators, district and household that the live suites use.

The battle, load and chaos suites exercise a running API against *real* seeded
operators (``chw001@nsanje.gov.mw`` etc.). This script makes that environment
reproducible instead of hand-written into a local database: run it against any
Postgres before starting those suites (and in CI before the battle job).

Idempotent: safe to re-run. Creates the schema if missing (never drops).
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import bcrypt

SERVICES_API = Path(__file__).resolve().parents[1] / "services" / "api"
if str(SERVICES_API) not in sys.path:
    sys.path.insert(0, str(SERVICES_API))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.database import Base  # noqa: E402
from app.models.geography import District  # noqa: E402
from app.models.household import Household  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

DISTRICT_NSANJE = "00000000-0000-0000-0000-000000000002"
HH_NSANJE = "00000000-0000-0000-0000-0000000000cc"
CHW001_USER_ID = "f6a1f844-81e6-4331-a169-764676c36565"
OPERATOR_PASSWORD = "Zisamale2026!"


def _bcrypt_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

OPERATORS = [
    {
        "user_id": CHW001_USER_ID,
        "username": "chw001@nsanje.gov.mw",
        "full_name": "Chikondi Banda",
        "role": UserRole.chw,
        "chw_id": "CHW-NSJ-001",
    },
    {
        "user_id": "f6a1f844-81e6-4331-a169-764676c36566",
        "username": "supervisor@nsanje.gov.mw",
        "full_name": "Supervisor Nsanje",
        "role": UserRole.supervisor,
    },
    {
        "user_id": "f6a1f844-81e6-4331-a169-764676c36567",
        "username": "dho@nsanje.gov.mw",
        "full_name": "District Health Officer",
        "role": UserRole.dho,
    },
    {
        "user_id": "f6a1f844-81e6-4331-a169-764676c36568",
        "username": "admin@mohp.gov.mw",
        "full_name": "MoHP Administrator",
        "role": UserRole.mohp,
    },
]


async def seed(url: str) -> None:
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(
                text(
                    "INSERT INTO districts (district_id, name, region) "
                    "VALUES (:district_id, 'Nsanje', 'south') "
                    "ON CONFLICT (district_id) DO NOTHING"
                ),
                {"district_id": DISTRICT_NSANJE},
            )
            for op in OPERATORS:
                await conn.execute(
                    text(
                        "INSERT INTO users (user_id, username, full_name, role, district_id, chw_id, is_active, password_hash) "
                        "VALUES (:user_id, :username, :full_name, :role, :district_id, :chw_id, TRUE, :password_hash) "
                        "ON CONFLICT (username) DO NOTHING"
                    ),
                    {
                        "user_id": op["user_id"],
                        "username": op["username"],
                        "full_name": op["full_name"],
                        "role": op["role"].value,
                        "district_id": DISTRICT_NSANJE,
                        "chw_id": op.get("chw_id"),
                        "password_hash": _bcrypt_hash(OPERATOR_PASSWORD),
                    },
                )
            await conn.execute(
                text(
                    "INSERT INTO households (household_id, chw_id, ta_name, village_name, "
                    "distance_to_facility_km, transport_cost_mwk, household_size, sync_status) "
                    "VALUES (:household_id, :chw_id, 'Mlolo', 'Mlolo', 3.5, 2000.0, 5, 'synced') "
                    "ON CONFLICT (household_id) DO NOTHING"
                ),
                {"household_id": HH_NSANJE, "chw_id": CHW001_USER_ID},
            )
    finally:
        await engine.dispose()

    print(f"Seeded demo operators, {DISTRICT_NSANJE} district and household "
          f"{HH_NSANJE} (password: {OPERATOR_PASSWORD})")


if __name__ == "__main__":
    import os

    from app.config import settings

    url = os.environ.get("DATABASE_URL") or settings.database_url
    asyncio.run(seed(url))