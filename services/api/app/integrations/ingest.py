"""Persist CHT documents and DHIS2 weekly cells into the warehouse."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.alerts.service import emit_alert
from app.integrations.cht_mapping import map_cht_document
from app.integrations.dhis2 import DHIS2Adapter, parse_analytics_payload
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.surveillance import SurveillanceWeekly
from app.models.visit import Visit
from app.sync.engine import SyncEntity, apply_batch, coarsen_gps, parse_client_datetime

RED_ACTIONS = [
    "Activate District Rapid Response Team",
    "Deploy outreach to affected TAs",
    "Request emergency commodity buffer from Central Medical Stores",
]


def parse_epi_week(period: str) -> tuple[str, int, int]:
    compact = period.replace("-", "").upper()
    if "W" not in compact:
        raise ValueError(f"Not an epidemiological week: {period}")
    year_str, week_str = compact.split("W", 1)
    year = int(year_str)
    week = int(week_str)
    return f"{year}W{week:02d}", year, week


def classify_disease(data_element: str) -> str:
    key = data_element.lower()
    mapping = {
        settings.dhis2_malaria_data_element.lower(): "malaria",
        settings.dhis2_diarrhea_data_element.lower(): "diarrhea",
        settings.dhis2_pneumonia_data_element.lower(): "pneumonia",
    }
    if key in mapping:
        return mapping[key]
    if "malaria" in key:
        return "malaria"
    if "diarr" in key or "cholera" in key:
        return "diarrhea"
    if "pneum" in key:
        return "pneumonia"
    return "other"


def alert_level_for_cases(confirmed_cases: int) -> str | None:
    """Red when weekly cases exceed the configured epidemic threshold.

    Yellow/green stay on the trend series until a real outbreak model exists;
    we do not fill the DHO inbox from a stand-in ratio.
    """
    threshold = max(int(settings.dhis2_alert_case_threshold), 1)
    if confirmed_cases > threshold:
        return "red"
    return None


async def ingest_dhis2_rows(
    db: AsyncSession,
    *,
    district_id: str,
    rows: list[dict[str, Any]],
    generate_alerts: bool = True,
) -> dict[str, int]:
    rows = parse_analytics_payload(rows)
    stored = 0
    alerts_created = 0
    for row in rows:
        try:
            week_id, year, week_number = parse_epi_week(str(row["period"]))
        except (KeyError, ValueError):
            continue
        try:
            cases = int(float(row.get("value") or 0))
        except (TypeError, ValueError):
            continue
        disease = classify_disease(str(row.get("data_element") or ""))
        existing_result = await db.execute(select(SurveillanceWeekly))
        match = next(
            (
                item
                for item in existing_result.scalars().all()
                if item.district_id == district_id
                and item.epidemiological_week == week_id
                and item.disease == disease
            ),
            None,
        )
        if match:
            match.confirmed_cases = cases
            match.year = year
            match.week_number = week_number
        else:
            db.add(
                SurveillanceWeekly(
                    id=str(uuid.uuid4()),
                    district_id=district_id,
                    epidemiological_week=week_id,
                    year=year,
                    week_number=week_number,
                    disease=disease,
                    confirmed_cases=cases,
                )
            )
        stored += 1
        if generate_alerts:
            level = alert_level_for_cases(cases)
            if level:
                created = await _upsert_alert(
                    db,
                    district_id=district_id,
                    disease=disease,
                    week_id=week_id,
                    cases=cases,
                    level=level,
                )
                alerts_created += int(created)
    await db.flush()
    return {"weeks_upserted": stored, "alerts_created": alerts_created}


async def ingest_from_dhis2(
    db: AsyncSession,
    *,
    district_id: str,
    org_units: list[str],
    periods: str,
    adapter: DHIS2Adapter | None = None,
    generate_alerts: bool = True,
) -> dict[str, int]:
    adapter = adapter or DHIS2Adapter()
    elements = [
        settings.dhis2_malaria_data_element,
        settings.dhis2_diarrhea_data_element,
        settings.dhis2_pneumonia_data_element,
    ]
    raw = await adapter.get_data(data_elements=elements, org_units=org_units, periods=periods)
    return await ingest_dhis2_rows(
        db, district_id=district_id, rows=raw, generate_alerts=generate_alerts
    )


async def _upsert_alert(
    db: AsyncSession,
    *,
    district_id: str,
    disease: str,
    week_id: str,
    cases: int,
    level: str,
) -> bool:
    """Threshold breach alert through the shared emission point.

    Idempotent per district+disease+week; risk normalized to the canonical
    0–1 scale (was 0–10 here, which corrupted ORDER BY risk_score).
    """
    risk01 = min(10.0, round(cases / 50.0, 1)) / 10.0
    _, created = await emit_alert(
        db,
        disease=disease,
        alert_level=level or "red",
        risk_score=risk01,
        scale=1.0,
        district_id=district_id,
        predicted_cases=int(cases * 1.15),
        ci_lower=int(cases * 0.9),
        ci_upper=int(cases * 1.4),
        recommended_actions=RED_ACTIONS,
        model_version="threshold-v1",
        idempotency_key=f"{district_id}:{disease}:{week_id}",
        status="pending",
    )
    return created


def _coerce_date(value: Any) -> str | None:
    if not value:
        return None
    text = str(value)
    if len(text) >= 10 and text[4] == "-":
        return text[:10]
    return None


def _build_cht_household(item: dict) -> dict:
    return dict(
        chw_id=item.get("chw_id"),
        village_name=item.get("village_name"),
        gps_lat=item.get("gps_lat"),
        gps_lon=item.get("gps_lon"),
        sync_status="synced",
    )


def _update_cht_household(row: Household, item: dict) -> None:
    row.chw_id = item.get("chw_id") or row.chw_id
    row.village_name = item.get("village_name") or row.village_name
    row.gps_lat = item.get("gps_lat")
    row.gps_lon = item.get("gps_lon")


# CHT is the system of record for its docs — always update, never conflict.
CHT_HOUSEHOLD_ENTITY = SyncEntity(
    model=Household,
    natural_key="household_id",
    build=_build_cht_household,
    update=_update_cht_household,
    transforms=(coarsen_gps,),
    on_existing="always_update",
)


def _build_cht_visit(item: dict) -> dict:
    measurements = {
        k: item[k]
        for k in ("bp_systolic", "bp_diastolic", "muac", "weight_kg")
        if item.get(k) is not None
    }
    return dict(
        household_id=item.get("household_id"),
        chw_id=item.get("chw_id"),
        visit_date=item["visit_date"],
        pregnancy_id=item.get("pregnancy_id"),
        child_id=item.get("child_id"),
        visit_type=item.get("visit_type") or "routine",
        danger_signs=item.get("danger_signs") or [],
        measurements=measurements,
        sync_status="synced",
    )


def _cht_visit_date(item: dict) -> None:
    """CHT reported_date may be missing (default now) or epoch millis."""
    raw = item.get("visit_date")
    if raw in (None, ""):
        item["visit_date"] = datetime.utcnow()
        return
    item["visit_date"] = parse_client_datetime(raw)


# External replays must stay idempotent — duplicates are skipped silently.
CHT_VISIT_ENTITY = SyncEntity(
    model=Visit,
    natural_key="visit_id",
    build=_build_cht_visit,
    transforms=(_cht_visit_date,),
    on_existing="skip",
)


async def ingest_cht_documents(db: AsyncSession, documents: list[dict]) -> dict[str, int]:
    counts = {"households": 0, "pregnancies": 0, "visits": 0, "skipped": 0}
    household_docs: list[dict] = []
    visit_docs: list[dict] = []
    for doc in documents:
        mapped = map_cht_document(doc)
        if not mapped:
            counts["skipped"] += 1
            continue
        kind = mapped["kind"]
        if kind == "household":
            household_docs.append(mapped)
        elif kind == "pregnancy":
            await _upsert_pregnancy(db, mapped)
            counts["pregnancies"] += 1
        elif kind == "visit":
            visit_docs.append(mapped)
        else:
            counts["skipped"] += 1

    households_batch = await apply_batch(db, CHT_HOUSEHOLD_ENTITY, household_docs)
    visits_batch = await apply_batch(db, CHT_VISIT_ENTITY, visit_docs)
    counts["households"] = households_batch.processed
    counts["visits"] = visits_batch.processed + visits_batch.skipped
    counts["skipped"] += len(households_batch.failures) + len(visits_batch.failures)
    await db.flush()
    return counts


async def _upsert_pregnancy(db: AsyncSession, mapped: dict[str, Any]) -> None:
    result = await db.execute(select(Pregnancy).where(Pregnancy.pregnancy_id == mapped["pregnancy_id"]))
    row = result.scalar_one_or_none()
    values = dict(
        household_id=mapped.get("household_id"),
        age=mapped.get("age"),
        parity=mapped.get("parity") or 0,
        gravida=mapped.get("gravida") or 1,
        lmp_date=_coerce_date(mapped.get("lmp_date")),
        edd_date=_coerce_date(mapped.get("edd_date")),
        bp_systolic=mapped.get("bp_systolic"),
        bp_diastolic=mapped.get("bp_diastolic"),
        hemoglobin=mapped.get("hemoglobin"),
        danger_signs=mapped.get("danger_signs") or [],
        woman_name=None,
        is_active=True,
        sync_status="synced",
    )
    if row:
        for key, value in values.items():
            setattr(row, key, value)
        return
    db.add(Pregnancy(pregnancy_id=mapped["pregnancy_id"], **values))


async def _upsert_visit(db: AsyncSession, mapped: dict[str, Any]) -> None:
    visit_id = mapped["visit_id"]
    result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    if result.scalar_one_or_none():
        return
    visit_date = mapped.get("visit_date") or datetime.now(timezone.utc)
    if isinstance(visit_date, (int, float)):
        # CHT reported_date is epoch milliseconds.
        ts = float(visit_date)
        if ts > 10_000_000_000:
            ts = ts / 1000
        visit_date = datetime.fromtimestamp(ts, tz=timezone.utc)
    db.add(
        Visit(
            visit_id=visit_id,
            household_id=mapped.get("household_id"),
            chw_id=mapped.get("chw_id"),
            visit_date=visit_date,
            pregnancy_id=mapped.get("pregnancy_id"),
            child_id=mapped.get("child_id"),
            visit_type=mapped.get("visit_type") or "routine",
            danger_signs=mapped.get("danger_signs") or [],
            measurements={
                k: mapped[k]
                for k in ("bp_systolic", "bp_diastolic", "muac", "weight_kg")
                if mapped.get(k) is not None
            },
            sync_status="synced",
        )
    )
