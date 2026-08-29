"""ops-layer tables owned by migrations, not runtime seeders

The MOYO map-layer datasets (community pins, maternity waiting homes,
TBAs, supply trucks, cold-chain units) previously had no home in the
migration history — the demo seeder ran CREATE TABLE IF NOT EXISTS at
request time. Schema belongs to Alembic; the seeder only inserts rows.

Statements are IF NOT EXISTS so environments that already created these
tables via the old seeder path upgrade cleanly.

Revision ID: e8f3a1c92d47
Revises: b7e2c1a94d05
Create Date: 2026-08-24
"""

from __future__ import annotations

from alembic import op

revision = "e8f3a1c92d47"
down_revision = "b7e2c1a94d05"
branch_labels = None
depends_on = None

_OPS_TABLE_DDL = [
    """CREATE TABLE IF NOT EXISTS community_pins (
        pin_id UUID PRIMARY KEY,
        district_id UUID,
        pin_type VARCHAR(40) NOT NULL,
        description VARCHAR(500) NOT NULL,
        village VARCHAR(100),
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        verified_by UUID,
        reported_at TIMESTAMP DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS maternity_waiting_homes (
        mwh_id UUID PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        district_id UUID,
        linked_facility_id UUID,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 0,
        occupied INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'open'
    )""",
    """CREATE TABLE IF NOT EXISTS traditional_birth_attendants (
        tba_id UUID PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        village VARCHAR(100),
        district_id UUID,
        linked_facility_id UUID,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        years_experience INTEGER NOT NULL DEFAULT 0,
        registered BOOLEAN NOT NULL DEFAULT FALSE
    )""",
    """CREATE TABLE IF NOT EXISTS supply_trucks (
        truck_id UUID PRIMARY KEY,
        driver_name VARCHAR(150) NOT NULL,
        cargo VARCHAR(200) NOT NULL,
        destination VARCHAR(150) NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        heading DOUBLE PRECISION NOT NULL DEFAULT 0,
        eta_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
        temperature_breach BOOLEAN NOT NULL DEFAULT FALSE,
        last_update TIMESTAMP DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS cold_chain_units (
        unit_id UUID PRIMARY KEY,
        facility_id UUID,
        name VARCHAR(150) NOT NULL,
        district_id UUID,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        fridge_status VARCHAR(20) NOT NULL DEFAULT 'working',
        last_temperature DOUBLE PRECISION,
        solar_powered BOOLEAN NOT NULL DEFAULT FALSE,
        last_reading_at TIMESTAMP DEFAULT now()
    )""",
]

_OPS_TABLES = [
    "cold_chain_units",
    "supply_trucks",
    "traditional_birth_attendants",
    "maternity_waiting_homes",
    "community_pins",
]


def upgrade() -> None:
    for ddl in _OPS_TABLE_DDL:
        op.execute(ddl)


def downgrade() -> None:
    for table in _OPS_TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table}")
