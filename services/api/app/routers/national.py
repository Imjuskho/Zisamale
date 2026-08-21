from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user, require_role

router = APIRouter(prefix="/api/v1/national", tags=["national"])


@router.get("/overview")
async def get_national_overview(
    user: dict = Depends(require_role("mohp", "phim")),
):
    return {
        "districts": [
            {
                "district_id": "nsanje-001",
                "district_name": "Nsanje",
                "malaria_risk_level": "high",
                "active_alerts": 3,
                "stockout_count": 2,
                "maternal_mortality_ratio": 430.0,
                "under5_mortality_rate": 83.0,
                "essential_service_coverage": 0.54,
            },
            {
                "district_id": "neno-002",
                "district_name": "Neno",
                "malaria_risk_level": "medium",
                "active_alerts": 1,
                "stockout_count": 0,
                "maternal_mortality_ratio": 380.0,
                "under5_mortality_rate": 71.0,
                "essential_service_coverage": 0.62,
            },
            {
                "district_id": "blantyre-003",
                "district_name": "Blantyre",
                "malaria_risk_level": "low",
                "active_alerts": 0,
                "stockout_count": 1,
                "maternal_mortality_ratio": 290.0,
                "under5_mortality_rate": 56.0,
                "essential_service_coverage": 0.73,
            },
        ],
        "national_summary": {
            "total_chws_active": 312,
            "total_facilities_reporting": 38,
            "national_malaria_risk": "medium",
            "alerts_last_7_days": 4,
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
