from __future__ import annotations

from pydantic import BaseModel


class PriorityVisit(BaseModel):
    household_id: str
    household_name: str
    visit_type: str
    risk_score: float
    risk_category: str
    due_date: str | None = None
    overdue_days: int = 0
    top_risk_factors: list[str] = []
    distance_km: float = 0.0


class DistrictSummary(BaseModel):
    district_id: str
    district_name: str
    malaria_risk_level: str
    active_alerts: int
    stockout_count: int
    maternal_mortality_ratio: float = 0.0
    under5_mortality_rate: float = 0.0
    essential_service_coverage: float = 0.0


class NationalOverview(BaseModel):
    districts: list[DistrictSummary]
    national_summary: dict = {}


class CommodityForecast(BaseModel):
    commodity: str
    district: str
    predicted_consumption: int
    recommended_order: int
    stockout_risk: float


class ForecastResponse(BaseModel):
    forecast_period: list[str]
    commodity_needs: list[CommodityForecast]
    budget_scenario: dict = {}
    executive_summary: str = ""
