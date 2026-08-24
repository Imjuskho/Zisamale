"""Demo data seeder — generates realistic Malawi disease surveillance data.

Seeds 12 weeks of malaria, diarrhea, and pneumonia case data for Nsanje district
with seasonal patterns and a simulated malaria outbreak in weeks 8-10.
Also seeds sample alerts, pregnancies, and children for dashboard demonstration.
"""

from __future__ import annotations

import json
import random
import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.alerts.service import emit_alert
from app.deps import require_role
from app.models.alert import Alert
from app.models.climate import ClimateDaily
from app.models.community import (
    ColdChainUnit,
    CommunityPin,
    MaternityWaitingHome,
    SupplyTruck,
    TraditionalBirthAttendant,
)
from app.models.surveillance import SurveillanceWeekly

router = APIRouter(prefix="/api/v1/demo", tags=["demo-seeder"])

NSANJE_ID = "00000000-0000-0000-0000-000000000002"

MALARIA_BASELINE = {1: 85, 2: 95, 3: 110, 4: 90, 5: 65, 6: 40, 7: 25, 8: 20, 9: 30, 10: 55, 11: 75, 12: 80}
DIARRHEA_BASELINE = {1: 45, 2: 55, 3: 70, 4: 60, 5: 40, 6: 25, 7: 15, 8: 12, 9: 18, 10: 30, 11: 38, 12: 42}
PNEUMONIA_BASELINE = {1: 20, 2: 18, 3: 15, 4: 12, 5: 18, 6: 30, 7: 40, 8: 38, 9: 25, 10: 15, 11: 12, 12: 18}


def _epi_weeks(n: int = 12) -> list[tuple[str, int, int]]:
    """Return (epi_week_str, year, week_number) tuples for last n weeks."""
    now = datetime.now(UTC)
    weeks = []
    for i in range(n - 1, -1, -1):
        week_num = ((now.month - 1) * 4 + (now.day // 7) + 52 - i) % 52
        if week_num == 0:
            week_num = 52
        year = now.year
        weeks.append((f"{year}W{week_num:02d}", year, week_num))
    weeks.reverse()
    return weeks


def _count(disease: str, week_num: int, is_outbreak: bool) -> int:
    baseline = {"malaria": MALARIA_BASELINE, "diarrhea": DIARRHEA_BASELINE, "pneumonia": PNEUMONIA_BASELINE}[disease]
    base = baseline.get(week_num, 30)
    noise = random.uniform(0.7, 1.3)
    count = int(base * noise)
    if disease == "malaria" and is_outbreak:
        count = int(count * random.uniform(2.5, 4.0))
    return max(1, count)


@router.post("/seed")
async def seed_demo_data(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    existing = await db.execute(
        select(func.count()).select_from(SurveillanceWeekly).where(
            SurveillanceWeekly.district_id == NSANJE_ID
        )
    )
    if existing.scalar():
        return {"status": "already_seeded"}

    weeks = _epi_weeks(12)
    stored = 0
    alerts_created = 0

    for epi_week_str, year, week_num in weeks:
        for disease in ["malaria", "diarrhea", "pneumonia"]:
            is_outbreak = disease == "malaria" and week_num in (25, 26, 27)
            cases = _count(disease, week_num, is_outbreak)

            db.add(SurveillanceWeekly(
                id=str(uuid.uuid4()),
                district_id=NSANJE_ID,
                epidemiological_week=epi_week_str,
                year=year,
                week_number=week_num,
                disease=disease,
                confirmed_cases=cases,
                suspected_cases=int(cases * random.uniform(1.2, 1.8)),
                rainfall_mm=round(random.uniform(0, 250), 1),
                temperature_c=round(random.uniform(18, 35), 1),
                humidity_pct=round(random.uniform(40, 90), 1),
            ))
            stored += 1

            if disease == "malaria" and is_outbreak and cases > 60:
                # Seeding must never page anyone: emit without dispatch.
                _, created = await emit_alert(
                    db,
                    disease="malaria",
                    alert_level="red",
                    risk_score=min(0.95, cases / 400),
                    scale=1.0,
                    district_id=NSANJE_ID,
                    predicted_cases=cases,
                    ci_lower=int(cases * 0.8),
                    ci_upper=int(cases * 1.3),
                    recommended_actions=[
                        "Activate District Rapid Response Team",
                        "Deploy outreach to affected TAs",
                        "Request emergency ACT buffer from Central Medical Stores",
                    ],
                    idempotency_key=f"seed:{NSANJE_ID}:malaria:{epi_week_str}",
                    status="pending",
                    generated_at=datetime.utcnow(),
                )
                alerts_created += int(created)

    await db.commit()
    return {"status": "ok", "weeks": len(weeks), "records": stored, "alerts": alerts_created, "district": "Nsanje"}


@router.post("/seed-children")
async def seed_children(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    result = await db.execute(text("SELECT count(*) FROM children"))
    if result.scalar():
        return {"status": "already_seeded"}

    hh_result = await db.execute(
        text("SELECT household_id::text FROM households WHERE chw_id = 'f6a1f844-81e6-4331-a169-764676c36565' LIMIT 3")
    )
    household_ids = [row[0] for row in hh_result.fetchall()]
    if not household_ids:
        return {"status": "no_households"}

    children = [
        ("Chiwemwe", "male", 6, 8.2, 71.0, [9.0], "low"),
        ("Tiyamike", "female", 18, 10.5, 78.0, [8.5], "low"),
        ("Fatsani", "male", 36, 13.2, 95.0, [12.0], "medium"),
    ]
    for i, (name, sex, age_m, bw, muac, vaccines, risk) in enumerate(children):
        dob_month = max(1, (age_m // 30 + 1) % 12 or 12)
        dob_year = 2026 - (age_m // 30 + 1) // 12
        dob = date(dob_year, dob_month, 1)
        await db.execute(
            text("""INSERT INTO children (
                child_id, household_id, child_name, sex, dob,
                birth_weight_kg, muac, vaccination_status,
                risk_category, created_at
            ) VALUES (
                :cid, :hhid, :name, :sex, :dob,
                :bw, :muac, CAST(:vaccines AS jsonb),
                :risk, now()
            )"""),
            {"cid": str(uuid.uuid4()), "hhid": household_ids[i % len(household_ids)],
             "name": name, "sex": sex, "dob": dob,
             "bw": bw, "muac": muac, "vaccines": json.dumps({"received": vaccines}),
             "risk": risk},
        )
    await db.commit()
    return {"status": "ok", "created": len(children)}


@router.get("/status")
async def seed_status(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    surveillance = await db.execute(select(func.count()).select_from(SurveillanceWeekly))
    alerts = await db.execute(select(func.count()).select_from(Alert))
    visits = await db.execute(text("SELECT count(*) FROM visits"))
    households = await db.execute(text("SELECT count(*) FROM households"))
    return {
        "surveillance_records": surveillance.scalar() or 0,
        "alerts": alerts.scalar() or 0,
        "visits": visits.scalar() or 0,
        "households": households.scalar() or 0,
    }


# --------------------------------------------------------------------------
# Ops-layer seed data: community pins, maternity waiting homes, TBAs,
# supply trucks, cold-chain units, and climate readings — the datasets
# behind the MOYO map layer toggles. Idempotent DDL + insert-if-empty.
# --------------------------------------------------------------------------

_OPS_DDL = [
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

# Nsanje-area coordinates (district centroid ≈ -16.9, 35.0)
_PINS = [
    ("drug_stockout", "LA stockout reported at outreach post", "Zombo", -16.82, 34.98, "pending"),
    ("dry_water_point", "Borehole broken, 300 households affected", "Mbembede", -16.95, 35.12, "verified"),
    ("road_blocked", "Dyserth-Chiromo road washed away", "Nyachilenda", -16.78, 35.05, "verified"),
    ("disease_report", "3 children with fever and vomiting", "Sorgin", -16.99, 34.92, "pending"),
    ("good_news", "ITN distribution reached all households", "Makhanga", -16.88, 35.18, "verified"),
    ("drug_stockout", "No ORS sachets at village clinic", "Chimwala", -16.94, 34.88, "pending"),
    ("disease_report", "Suspected cholera case referred to Nsanje DH", "Bitilinyu", -16.85, 35.22, "verified"),
    ("good_news", "New safe water point commissioned", "Osiye", -17.02, 35.08, "dismissed"),
]
_MHOMES = [
    ("Nsanje District MWH", -16.912, 34.995, 24, 19, "open"),
    ("Bangula MWH", -16.78, 35.03, 16, 16, "full"),
    ("Makhanga MWH", -16.88, 35.18, 12, 5, "open"),
]
_TBAS = [
    ("Agnes Mbewe", "Zombo", -16.83, 34.97, 14, True),
    ("Rhoda Chisoni", "Mbembede", -16.96, 35.11, 9, True),
    ("Fatsani Njere", "Sorgin", -16.98, 34.93, 21, True),
    ("Tiwonge Banda", "Makhanga", -16.87, 35.17, 6, True),
    ("Esnath Kadam'manja", "Chimwala", -16.95, 34.89, 12, True),
    ("Maria Yobe", "Osiye", -17.01, 35.09, 4, False),
]
_TRUCKS = [
    ("James Banda", "ACT buffers + RUTF", "Nsanje District Hospital", -16.42, 34.98, 195.0, 6.5, False),
    ("Alinafe Chirwa", "Vaccine consignment (cold)", "Bangula Outreach", -16.61, 35.01, 200.0, 4.0, False),
    ("Yohane Mvula", "Blood products + MgSO4", "Nsanje DH Maternity", -16.75, 34.96, 190.0, 2.5, True),
]
_COLDCHAIN = [
    ("Nsanje DH Central Vaccine Store", -16.908, 34.992, "working", 3.8, True),
    ("Bangula Health Centre Fridge", -16.782, 35.028, "working", 4.2, True),
    ("Makhunga Outreach Gas Fridge", -16.876, 35.176, "broken", None, False),
    ("Chididi Health Post Fridge", -16.995, 34.915, "working", 5.1, False),
    ("Nyachilenda Clinic Solar Fridge", -16.778, 35.061, "working", 3.9, True),
]


def _climate_days(n: int = 14) -> list[tuple]:
    """(date, rainfall_mm, temp_mean, soil_moisture, ndvi) for recent days."""
    today = date.today()
    rows = []
    for i in range(n - 1, -1, -1):
        d = today - timedelta(days=i)
        wet_season = d.month in (11, 12, 1, 2, 3)
        rain = random.uniform(8, 45) if wet_season else random.uniform(0, 6)
        if i == 0:
            rain *= 3.2  # current heavy-rain episode drives flood/briefing signals
        rows.append((
            d,
            round(rain, 1),
            round(random.uniform(24, 33), 1),
            round(min(1.0, 0.35 + rain / 120), 2),
            round(random.uniform(0.35, 0.75), 2),
        ))
    return rows


@router.post("/seed-ops")
async def seed_ops_layers(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    """Create ops-layer tables if absent; populate them and climate_daily."""
    for ddl in _OPS_DDL:
        await db.execute(text(ddl))

    created: dict[str, int] = {}

    counts = {
        "community_pins": "SELECT count(*) FROM community_pins",
        "maternity_waiting_homes": "SELECT count(*) FROM maternity_waiting_homes",
        "traditional_birth_attendants": "SELECT count(*) FROM traditional_birth_attendants",
        "supply_trucks": "SELECT count(*) FROM supply_trucks",
        "cold_chain_units": "SELECT count(*) FROM cold_chain_units",
        "climate_daily": "SELECT count(*) FROM climate_daily",
    }
    existing = {k: (await db.execute(text(v))).scalar() for k, v in counts.items()}

    if not existing["community_pins"]:
        for ptype, desc, village, lat, lng, status in _PINS:
            db.add(CommunityPin(
                pin_id=str(uuid.uuid4()), district_id=NSANJE_ID,
                pin_type=ptype, description=desc, village=village,
                lat=lat, lng=lng, status=status,
                verified_by=str(uuid.uuid4()) if status != "pending" else None,
                reported_at=datetime.utcnow(),
            ))
        created["community_pins"] = len(_PINS)

    if not existing["maternity_waiting_homes"]:
        for name, lat, lng, cap, occ, status in _MHOMES:
            db.add(MaternityWaitingHome(
                mwh_id=str(uuid.uuid4()), name=name, district_id=NSANJE_ID,
                linked_facility_id=None, lat=lat, lng=lng,
                capacity=cap, occupied=occ, status=status,
            ))
        created["maternity_waiting_homes"] = len(_MHOMES)

    if not existing["traditional_birth_attendants"]:
        for name, village, lat, lng, years, reg in _TBAS:
            db.add(TraditionalBirthAttendant(
                tba_id=str(uuid.uuid4()), name=name, village=village,
                district_id=NSANJE_ID, linked_facility_id=None,
                lat=lat, lng=lng, years_experience=years, registered=reg,
            ))
        created["traditional_birth_attendants"] = len(_TBAS)

    if not existing["supply_trucks"]:
        for driver, cargo, dest, lat, lng, heading, eta, breach in _TRUCKS:
            db.add(SupplyTruck(
                truck_id=str(uuid.uuid4()), driver_name=driver, cargo=cargo,
                destination=dest, lat=lat, lng=lng, heading=heading,
                eta_hours=eta, temperature_breach=breach,
                last_update=datetime.utcnow(),
            ))
        created["supply_trucks"] = len(_TRUCKS)

    if not existing["cold_chain_units"]:
        for name, lat, lng, status, temp, solar in _COLDCHAIN:
            db.add(ColdChainUnit(
                unit_id=str(uuid.uuid4()), facility_id=None, name=name,
                district_id=NSANJE_ID, lat=lat, lng=lng, fridge_status=status,
                last_temperature=temp, solar_powered=solar,
                last_reading_at=datetime.utcnow(),
            ))
        created["cold_chain_units"] = len(_COLDCHAIN)

    if not existing["climate_daily"]:
        districts_rows = (await db.execute(text(
            "SELECT district_id::text, name FROM districts ORDER BY name LIMIT 3"
        ))).fetchall()
        targets = [(did, nm) for did, nm in districts_rows] or [(NSANJE_ID, "Nsanje")]
        n_climate = 0
        for did, _name in targets:
            for obs_date, rain, temp, moisture, ndvi in _climate_days():
                db.add(ClimateDaily(
                    id=str(uuid.uuid4()), district_id=did, ta_id=None,
                    observation_date=obs_date, source="demo",
                    rainfall_mm=rain, temperature_max_c=temp + 4,
                    temperature_min_c=temp - 6, temperature_mean_c=temp,
                    humidity_pct=round(random.uniform(50, 90), 1),
                    soil_moisture=moisture, ndvi=ndvi,
                ))
                n_climate += 1
        created["climate_daily"] = n_climate

    await db.commit()
    return {
        "status": "ok" if created else "already_seeded",
        "created": created,
        "existing_counts": existing,
    }

