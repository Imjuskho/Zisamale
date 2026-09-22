"""MOYO map layers API — operational datasets behind the layer toggles.

Every endpoint returns shapes consumed directly by the dashboard's
LeafletMap component. CHW presence, immunization coverage, nutrition,
outbreak heat, climate overlays, and the health-weather briefing are
DERIVED from core domain tables (users/households/visits/children/
alerts/climate_daily); pins, maternity waiting homes, TBAs, trucks and
cold-chain units are stored tables seeded for demonstration.
"""

from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role

router = APIRouter(prefix="/api/v1/map", tags=["map-layers"])

# District centroids (lat, lng) — same reference coordinates the map uses.
DISTRICT_CENTROIDS: dict[str, tuple[float, float]] = {
    "chitipa": (-10.05, 33.3),
    "karonga": (-9.93, 33.93),
    "rumphi": (-11.02, 33.9),
    "mzimba": (-11.9, 33.6),
    "nkhata-bay": (-11.6, 34.3),
    "likoma": (-12.05, 34.73),
    "kasungu": (-13.03, 33.48),
    "nkhotakota": (-12.9, 34.3),
    "ntchisi": (-13.5, 33.9),
    "dowa": (-13.65, 33.93),
    "salima": (-13.8, 34.45),
    "lilongwe": (-13.97, 33.77),
    "mchinji": (-13.75, 32.95),
    "dedza": (-14.3, 34.3),
    "ntcheu": (-14.85, 34.6),
    "mangochi": (-14.5, 35.3),
    "balaka": (-14.9, 34.95),
    "machinga": (-15.05, 35.5),
    "zomba": (-15.4, 35.3),
    "phalombe": (-15.72, 35.7),
    "chiradzulu": (-15.68, 35.15),
    "blantyre": (-15.8, 35.0),
    "thyolo": (-16.1, 35.1),
    "mulanje": (-16.0, 35.6),
    "mwanza": (-16.0, 34.5),
    "neno": (-15.5, 34.55),
    "chikwawa": (-16.3, 34.8),
    "nsanje": (-16.9, 35.0),
}


def _slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def _iso(dt: datetime | None) -> str:
    return (dt or datetime.now(UTC)).isoformat()


@router.get("/chw-presence")
async def chw_presence(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "supervisor")),
):
    """CHW sync locations derived from assigned-household GPS centroids."""
    rows = (
        (
            await db.execute(
                text("""
        SELECT u.user_id::text                AS chw_id,
               u.full_name                    AS chw_name,
               MAX(h.ta_name)                 AS ta_name,
               AVG(h.gps_lat)                 AS lat,
               AVG(h.gps_lon)                 AS lng,
               COUNT(DISTINCT v.visit_id)     AS visits_today,
               MAX(v.visit_date)              AS last_visit
        FROM users u
        LEFT JOIN households h ON h.chw_id = u.user_id
        LEFT JOIN visits v
               ON v.chw_id = u.user_id
              AND v.visit_date >= CURRENT_DATE
        WHERE u.role = 'chw'
        GROUP BY u.user_id, u.full_name
        ORDER BY u.full_name
    """)
            )
        )
        .mappings()
        .all()
    )

    now = datetime.now(UTC)
    out = []
    for r in rows:
        lat, lng = r["lat"], r["lng"]
        last_visit = r["last_visit"]
        recent = bool(last_visit) and (now - last_visit).total_seconds() < 48 * 3600
        out.append(
            {
                "chw_id": r["chw_id"],
                "chw_name": r["chw_name"],
                "ta_name": r["ta_name"] or "Unassigned",
                "lat": round(float(lat), 5) if lat is not None else None,
                "lng": round(float(lng), 5) if lng is not None else None,
                "last_sync_at": _iso(last_visit),
                "presence_level": "ghost" if lat is None else ("precise" if recent else "area"),
                "visits_today": int(r["visits_today"] or 0),
                "status": "active" if recent else "stale",
            }
        )
    return out


@router.get("/community-pins")
async def community_pins(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "supervisor", "phim")),
):
    rows = (await db.execute(select_pins())).mappings().all()
    return [
        {
            "pin_id": r["pin_id"],
            "pin_type": r["pin_type"],
            "description": r["description"],
            "village": r["village"] or "",
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "status": r["status"],
            "reported_at": _iso(r["reported_at"]),
            "verified_by": r["verified_by"],
        }
        for r in rows
    ]


def select_pins():
    return text(
        "SELECT pin_id::text, pin_type, description, village, lat, lng,"
        " status, verified_by::text, reported_at FROM community_pins"
        " ORDER BY reported_at DESC LIMIT 300"
    )


@router.get("/outbreak-predictions")
async def outbreak_predictions(
    weeks: int = Query(4, le=4),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "phim")),
):
    """4-week risk heat surface projected from live alert risk scores."""
    rows = (
        (
            await db.execute(
                text("""
        SELECT DISTINCT ON (a.district_id)
               a.district_id, a.disease, a.risk_score,
               COALESCE(d.name, 'Unknown') AS district_name
        FROM alerts a
        LEFT JOIN districts d ON d.district_id = a.district_id
        WHERE a.risk_score IS NOT NULL
        ORDER BY a.district_id, a.generated_at DESC
    """)
            )
        )
        .mappings()
        .all()
    )

    out = []
    for r in rows:
        centroid = DISTRICT_CENTROIDS.get(_slug(r["district_name"]))
        if not centroid or r["risk_score"] is None:
            continue
        base_risk = min(1.0, float(r["risk_score"]) * 10 / 100 + 0.3)
        for week in range(weeks):
            decayed = round(base_risk * (0.94**week), 3)
            if decayed < 0.25:
                continue
            out.append(
                {
                    "week_offset": week,
                    "lat": centroid[0],
                    "lng": centroid[1],
                    "risk_score": decayed,
                    "disease": r["disease"],
                }
            )
    return out


async def _immunization_villages(db: AsyncSession) -> list[dict]:
    rows = (
        (
            await db.execute(
                text("""
        SELECT LOWER(REGEXP_REPLACE(h.village_name, '\\s+', '-', 'g')) AS village_id,
               h.village_name                                        AS name,
               MAX(h.ta_name)                                        AS ta_name,
               AVG(h.gps_lat)                                        AS lat,
               AVG(h.gps_lon)                                        AS lng,
               COUNT(c.child_id)                                     AS child_count,
               SUM(CASE WHEN jsonb_array_length(
                        COALESCE(c.vaccination_status->'received', '[]'::jsonb)) >= 3
                   THEN 1 ELSE 0 END)                                AS fully_vax
        FROM households h
        LEFT JOIN children c ON c.household_id = h.household_id
        WHERE h.village_name IS NOT NULL AND h.village_name <> ''
        GROUP BY h.village_name
        HAVING AVG(h.gps_lat) IS NOT NULL
    """)
            )
        )
        .mappings()
        .all()
    )

    villages = []
    for r in rows:
        n = max(int(r["child_count"]), 1)
        dpt3 = min(1.0, (int(r["fully_vax"]) / n))
        measles = min(1.0, dpt3 * 0.85)
        villages.append(
            {
                "village_id": r["village_id"],
                "name": r["name"],
                "ta_name": r["ta_name"] or "",
                "lat": round(float(r["lat"]), 5),
                "lng": round(float(r["lng"]), 5),
                "under5_population": n * 12,
                "dpt3_coverage": round(dpt3, 3),
                "measles_coverage": round(measles, 3),
                "pentavalent_coverage": round(dpt3 * 0.95, 3),
            }
        )
    return villages


@router.get("/immunization/villages")
async def immunization_villages(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp")),
):
    """Village micro-planning data derived from child vaccination records."""
    return await _immunization_villages(db)


@router.get("/immunization/outreach-routes")
async def outreach_routes(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp")),
):
    """Greedy nearest-neighbour routes over the lowest-coverage villages."""
    villages = [v for v in await _immunization_villages(db) if v["dpt3_coverage"] < 0.65]
    villages.sort(key=lambda v: v["dpt3_coverage"])

    routes: list[dict] = []
    remaining = villages[:]
    route_no = 1
    while remaining:
        stops = [remaining.pop(0)]
        while len(stops) < 5 and remaining:
            last = stops[-1]
            remaining.sort(key=lambda v: math.hypot(v["lat"] - last["lat"], v["lng"] - last["lng"]))
            stops.append(remaining.pop(0))
        routes.append(
            {
                "route_id": f"route-{route_no}",
                "label": f"Outreach Route {route_no} ({len(stops)} villages)",
                "stops": [
                    {
                        "lat": s["lat"],
                        "lng": s["lng"],
                        "village_name": s["name"],
                        "unvaccinated_count": round(
                            (1 - s["dpt3_coverage"]) * s["under5_population"]
                        ),
                    }
                    for s in stops
                ],
                "total_unvaccinated": sum(
                    round((1 - s["dpt3_coverage"]) * s["under5_population"]) for s in stops
                ),
                "estimated_hours": round(len(stops) * 1.2 + 0.5, 1),
            }
        )
        route_no += 1
    return routes


@router.get("/cold-chain")
async def cold_chain(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp")),
):
    rows = (
        (
            await db.execute(
                text(
                    "SELECT unit_id::text, facility_id::text, name, lat, lng, fridge_status,"
                    " last_temperature, solar_powered FROM cold_chain_units ORDER BY name"
                )
            )
        )
        .mappings()
        .all()
    )
    return [
        {
            "facility_id": r["facility_id"] or r["unit_id"],
            "name": r["name"],
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "fridge_status": r["fridge_status"],
            "last_temperature": float(r["last_temperature"])
            if r["last_temperature"] is not None
            else None,
            "solar_powered": bool(r["solar_powered"]),
        }
        for r in rows
    ]


@router.get("/maternity-homes")
async def maternity_homes(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "chw")),
):
    rows = (
        (
            await db.execute(
                text(
                    "SELECT mwh_id::text, name, lat, lng, capacity, occupied, status,"
                    " linked_facility_id::text FROM maternity_waiting_homes ORDER BY name"
                )
            )
        )
        .mappings()
        .all()
    )
    return [
        {
            "mwh_id": r["mwh_id"],
            "name": r["name"],
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "capacity": int(r["capacity"]),
            "occupied": int(r["occupied"]),
            "status": r["status"],
            "linked_facility_id": r["linked_facility_id"] or "",
        }
        for r in rows
    ]


@router.get("/tbas")
async def tbas(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "chw")),
):
    rows = (
        (
            await db.execute(
                text(
                    "SELECT tba_id::text, name, lat, lng, years_experience, registered,"
                    " linked_facility_id::text, village FROM traditional_birth_attendants ORDER BY name"
                )
            )
        )
        .mappings()
        .all()
    )
    return [
        {
            "tba_id": r["tba_id"],
            "name": r["name"],
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "years_experience": int(r["years_experience"]),
            "registered": bool(r["registered"]),
            "linked_facility_id": r["linked_facility_id"] or "",
            "village": r["village"] or "",
        }
        for r in rows
    ]


@router.get("/supply-trucks")
async def supply_trucks(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "phim")),
):
    rows = (
        (
            await db.execute(
                text(
                    "SELECT truck_id::text, driver_name, lat, lng, heading, cargo, destination,"
                    " eta_hours, temperature_breach, last_update FROM supply_trucks"
                    " ORDER BY last_update DESC"
                )
            )
        )
        .mappings()
        .all()
    )
    return [
        {
            "truck_id": r["truck_id"],
            "driver_name": r["driver_name"],
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "heading": float(r["heading"]),
            "cargo": r["cargo"],
            "destination": r["destination"],
            "eta_hours": float(r["eta_hours"]),
            "temperature_breach": bool(r["temperature_breach"]),
            "last_update": _iso(r["last_update"]),
        }
        for r in rows
    ]


@router.get("/nutrition")
async def nutrition(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp")),
):
    """Village nutrition surveillance derived from child MUAC screenings."""
    rows = (
        (
            await db.execute(
                text("""
        SELECT LOWER(REGEXP_REPLACE(h.village_name, '\\s+', '-', 'g')) AS village_id,
               h.village_name                                         AS village_name,
               AVG(h.gps_lat)                                         AS lat,
               AVG(h.gps_lon)                                         AS lng,
               COUNT(c.child_id)                                      AS muac_screenings,
               AVG(CASE WHEN c.muac IS NOT NULL AND c.muac < 12.5
                        THEN 1.0 ELSE 0.0 END)                        AS wasting_rate,
               AVG(CASE WHEN c.risk_category IN ('medium', 'high')
                        THEN 1.0 ELSE 0.0 END)                        AS stunting_rate
        FROM households h
        JOIN children c ON c.household_id = h.household_id
        WHERE h.village_name IS NOT NULL AND h.village_name <> ''
        GROUP BY h.village_name
        HAVING AVG(h.gps_lat) IS NOT NULL
    """)
            )
        )
        .mappings()
        .all()
    )

    return [
        {
            "village_id": r["village_id"],
            "village_name": r["village_name"],
            "lat": round(float(r["lat"]), 5),
            "lng": round(float(r["lng"]), 5),
            "stunting_rate": round(float(r["stunting_rate"]), 3),
            "wasting_rate": round(float(r["wasting_rate"]), 3),
            "muac_screenings": int(r["muac_screenings"]),
            "rutf_needed": float(r["wasting_rate"]) >= 0.15,
        }
        for r in rows
    ]


OVERLAY_GRID_OFFSETS = [(0.0, 0.0), (0.12, 0.08), (-0.12, 0.06), (0.08, -0.12), (-0.08, -0.1)]


@router.get("/climate-overlays")
async def climate_overlays(
    type: str = Query(..., pattern="^(rainfall|flood|temperature|vegetation)$"),  # noqa: A002  # public wire query key `?type=`
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "phim")),
):
    """Latest climate reading per district rendered as an overlay grid."""
    rows = (
        (
            await db.execute(
                text("""
        SELECT DISTINCT ON (c.district_id)
               COALESCE(d.name, '') AS district_name,
               c.rainfall_mm, c.temperature_mean_c, c.soil_moisture, c.ndvi
        FROM climate_daily c
        JOIN districts d ON d.district_id = c.district_id
        WHERE c.district_id IS NOT NULL
        ORDER BY c.district_id, c.observation_date DESC
    """)
            )
        )
        .mappings()
        .all()
    )

    out: list[dict] = []
    for r in rows:
        centroid = DISTRICT_CENTROIDS.get(_slug(r["district_name"]))
        if not centroid:
            continue

        if type == "rainfall":
            if r["rainfall_mm"] is None:
                continue
            value = float(r["rainfall_mm"])
            label = f"{value:.0f} mm rainfall"
            color = "#0f7b8a"
        elif type == "flood":
            moisture = float(r["soil_moisture"]) if r["soil_moisture"] is not None else None
            rain = float(r["rainfall_mm"]) if r["rainfall_mm"] is not None else 0.0
            value = min(1.0, ((moisture or 0) * 0.6) + (rain / 250) * 0.4)
            label = f"Flood risk {round(value * 100)}%"
            color = "#1e40af"
        elif type == "temperature":
            if r["temperature_mean_c"] is None:
                continue
            value = float(r["temperature_mean_c"])
            label = f"{value:.1f} °C mean"
            color = "#e65100"
        else:
            if r["ndvi"] is None:
                continue
            value = float(r["ndvi"])
            label = f"NDVI {value:.2f}"
            color = "#2d7d46"

        for _i, (dy, dx) in enumerate(OVERLAY_GRID_OFFSETS):
            out.append(
                {
                    "overlay_type": type,
                    "lat": round(centroid[0] + dy, 4),
                    "lng": round(centroid[1] + dx, 4),
                    "value": round(value, 3),
                    "label": f"{r['district_name']}: {label}",
                    "color": color,
                }
            )
    return out


@router.get("/weather-briefing")
async def weather_briefing(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "mohp", "phim")),
):
    """Daily health-weather brief derived from climate + active alerts."""
    climate = (
        (
            await db.execute(
                text("""
        SELECT AVG(c.temperature_mean_c) AS mean_temp,
               SUM(c.rainfall_mm)        AS week_rain
        FROM climate_daily c
        WHERE c.observation_date >= CURRENT_DATE - INTERVAL '7 days'
          AND c.observation_date <= CURRENT_DATE
    """)
            )
        )
        .mappings()
        .first()
    )

    alerts = (
        (
            await db.execute(
                text("""
        SELECT alert_level, COUNT(*) AS n FROM alerts
        WHERE status IN ('pending', 'acknowledged')
        GROUP BY alert_level
    """)
            )
        )
        .mappings()
        .all()
    )

    counts = {r["alert_level"]: int(r["n"]) for r in alerts}
    week_rain = float(climate["week_rain"] or 0) if climate else 0.0
    mean_temp = (
        float(climate["mean_temp"]) if climate and climate["mean_temp"] is not None else 26.0
    )

    if counts.get("red") or week_rain > 150:
        level = "red"
    elif counts.get("yellow") or week_rain > 75:
        level = "yellow"
    else:
        level = "green"

    risk_summary = (
        f"{counts.get('red', 0)} red and {counts.get('yellow', 0)} yellow alerts active. "
        f"Seven-day cumulative rainfall {week_rain:.0f} mm at {mean_temp:.1f} °C mean."
    )
    action_items: list[str] = []
    if week_rain > 100:
        action_items.append("Pre-position cholera supplies in flood-prone TAs")
    if counts.get("red"):
        action_items.append("Confirm DRRT deployment for red-alert districts")
    if mean_temp > 30:
        action_items.append("Issue heat advisories with ANC clinics")
    if not action_items:
        action_items.append("No adverse conditions — maintain routine surveillance")

    return {
        "briefing_id": str(uuid.uuid4()),
        "generated_at": datetime.now(UTC).isoformat(),
        "district": "All districts",
        "risk_summary": risk_summary,
        "action_items": action_items,
        "alert_level": level,
    }
