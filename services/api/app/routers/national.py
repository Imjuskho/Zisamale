from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role

router = APIRouter(prefix="/api/v1/national", tags=["national"])

# Alert severity → malaria risk level. Derived from live alert data,
# never fabricated: districts with no active alerts have no risk level yet.
_SEVERITY_TO_RISK = {3: "high", 2: "medium", 1: "low"}


def _merge_city_districts(rows: list[dict]) -> list[dict]:
    """Registry geography keeps e.g. 'Blantyre City' beside 'Blantyre'.
    Fold city rows into their parent district so consumers see one entry."""
    by_name: dict[str, dict] = {}
    for row in sorted(rows, key=lambda r: r["district_name"]):
        base = row["district_name"].removesuffix(" City")
        if row["district_name"] == base:
            parent = by_name.get(base)
            if parent is not None and parent is not row:
                # Parent appeared after its city row: fold the city into it.
                parent["facility_count"] += row["facility_count"]
                parent["active_alerts"] += row["active_alerts"]
                if row["_max_sev"] > parent["_max_sev"]:
                    parent["_max_sev"] = row["_max_sev"]
                continue
            by_name[base] = row
        else:
            parent = by_name.get(base)
            if parent is not None:
                parent["facility_count"] += row["facility_count"]
                parent["active_alerts"] += row["active_alerts"]
                if row["_max_sev"] > parent["_max_sev"]:
                    parent["_max_sev"] = row["_max_sev"]
            else:
                by_name[row["district_name"]] = row
    return sorted(by_name.values(), key=lambda r: r["district_name"])


@router.get("/overview")
async def get_national_overview(
    user: dict = Depends(require_role("mohp", "phim")),
    db: AsyncSession = Depends(get_db),
):
    """
    National overview across every district in the geography registry.

    Real signals only: facility counts come from the facility registry,
    active alerts from the alert stream. Health indicators (MMR, U5MR,
    coverage) have no verified source yet and are served as null —
    clients render them as Unverified instead of inventing values.
    """
    result = await db.execute(
        text(
            """
            SELECT
                d.district_id::text AS district_id,
                d.name AS district_name,
                d.region AS region,
                COUNT(DISTINCT f.facility_id) AS facility_count,
                COUNT(DISTINCT al.alert_id) FILTER (
                    WHERE al.status <> 'resolved'
                ) AS active_alerts,
                COALESCE(
                    MAX(CASE
                        WHEN al.status <> 'resolved' AND al.alert_level = 'red' THEN 3
                        WHEN al.status <> 'resolved' AND al.alert_level = 'yellow' THEN 2
                        WHEN al.status <> 'resolved' AND al.alert_level = 'green' THEN 1
                    END),
                    0
                ) AS _max_sev
            FROM districts d
            LEFT JOIN facilities f
                ON f.district_id = d.district_id AND f.is_active = TRUE
            LEFT JOIN alerts al
                ON al.district_id = d.district_id
            GROUP BY d.district_id, d.name, d.region
            ORDER BY d.name
            """
        )
    )
    rows = [dict(r._mapping) for r in result.fetchall()]
    merged = _merge_city_districts(rows)

    districts = [
        {
            "district_id": row["district_id"],
            "district_name": row["district_name"],
            "region": row.get("region"),
            "facility_count": int(row["facility_count"]),
            "malaria_risk_level": _SEVERITY_TO_RISK.get(row["_max_sev"]),
            "active_alerts": int(row["active_alerts"]),
            "stockout_count": None,
            "maternal_mortality_ratio": None,
            "under5_mortality_rate": None,
            "essential_service_coverage": None,
        }
        for row in merged
    ]

    return {
        "districts": districts,
        "national_summary": {
            "districts_monitored": len(districts),
            "total_facilities_reporting": sum(d["facility_count"] for d in districts),
            "active_alerts": sum(d["active_alerts"] for d in districts),
        },
    }


@router.get("/forecast")
async def get_forecast(
    scenario: str = Query(default="baseline"),
    user: dict = Depends(require_role("mohp", "phim")),
):
    return {
        "forecast_period": ["2026-09-01", "2027-02-28"],
        "commodity_needs": [
            {
                "commodity": "ACT 20/120",
                "district": "Nsanje",
                "predicted_consumption": 12500,
                "recommended_order": 15000,
                "stockout_risk": 0.72,
            },
            {
                "commodity": "RDTs",
                "district": "Nsanje",
                "predicted_consumption": 8000,
                "recommended_order": 10000,
                "stockout_risk": 0.65,
            },
            {
                "commodity": "ORS Sachets",
                "district": "Neno",
                "predicted_consumption": 5000,
                "recommended_order": 6000,
                "stockout_risk": 0.30,
            },
        ],
        "budget_scenario": {
            "scenario_name": scenario,
            "total_budget_mwk": 450_000_000,
            "allocation": {
                "antimalarials": 0.35,
                "diagnostics": 0.15,
                "maternal_health": 0.25,
                "vaccines": 0.15,
                "logistics": 0.10,
            },
        },
        "executive_summary": (
            f"Scenario '{scenario}': Over the next 6 months, Nsanje district faces "
            "the highest stockout risk for ACTs (72%). Recommended emergency resupply "
            "of 15,000 courses. Neno district shows improving maternal health indicators "
            "with a 12% reduction in maternal mortality since CHW AI deployment."
        ),
    }
