from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import create_access_token
from app.main import app


def _mohp_headers() -> dict[str, str]:
    token = create_access_token({"sub": "mohp-test", "role": "mohp"})
    return {"Authorization": f"Bearer {token}"}


def _chw_headers() -> dict[str, str]:
    token = create_access_token({"sub": "chw-test", "role": "chw", "chw_id": "chw-test"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["version"] == "0.2.0"
    assert "checks" in data
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Zisamale API"
    assert data["version"] == "0.2.0"
    assert data["docs"] == "/docs"


@pytest.mark.asyncio
async def test_docs_available(client: AsyncClient):
    response = await client.get("/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_priority_list_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/chw/test-chw-id/priority-list")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_priority_list_forbids_other_chw(client: AsyncClient):
    response = await client.get(
        "/api/v1/chw/someone-else/priority-list",
        headers=_chw_headers(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["/priority-list", "/overrides", "/households"])
async def test_scope_guard_rejects_cross_catchment_paths(client: AsyncClient, path: str):
    """The scope guard owns tenancy for every /chw/{chw_id} read — one table."""
    response = await client.get(
        f"/api/v1/chw/someone-else{path}",
        headers=_chw_headers(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_national_overview_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/national/overview")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_national_overview_shape(client: AsyncClient):
    """Districts come from the geography registry; unknown metrics are null."""
    response = await client.get(
        "/api/v1/national/overview", headers=_mohp_headers()
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["districts"], list)
    assert isinstance(data["national_summary"]["districts_monitored"], int)
    for district in data["districts"]:
        assert {"district_id", "district_name", "facility_count", "active_alerts"} <= set(
            district
        )
        assert district["maternal_mortality_ratio"] is None
        assert district["essential_service_coverage"] is None
        assert district["malaria_risk_level"] in ("low", "medium", "high", None)
    names = [d["district_name"] for d in data["districts"]]
    assert len(names) == len(set(names)), "city/district rows must be merged"


@pytest.mark.asyncio
async def test_national_overview_forbidden_for_chw(client: AsyncClient):
    response = await client.get(
        "/api/v1/national/overview", headers=_chw_headers()
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_national_forecast_returns_data(client: AsyncClient):
    response = await client.get(
        "/api/v1/national/forecast?scenario=baseline",
        headers=_mohp_headers(),
    )
    assert response.status_code == 200
    data = response.json()
    assert "forecast_period" in data
    assert "commodity_needs" in data
    assert "executive_summary" in data
    assert len(data["commodity_needs"]) > 0


@pytest.mark.asyncio
async def test_surveillance_trends(client: AsyncClient):
    response = await client.get(
        "/api/v1/district/test-district/surveillance/trends",
        headers=_mohp_headers(),
    )
    assert response.status_code == 200
    data = response.json()
    assert "actual_cases" in data
    assert "predicted_cases" in data
    assert data["model_accuracy"] is None
    assert data["source"] in ("none", "dhis2")
