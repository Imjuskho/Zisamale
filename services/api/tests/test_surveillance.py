"""Surveillance honesty endpoints: auth, roles, and empty-DB shapes."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import create_access_token
from app.main import app


def _token(role: str, **extra) -> dict[str, str]:
    payload = {"sub": f"{role}-surv-test", "role": role}
    if extra:
        payload.update(extra)
    return {
        "Authorization": f"Bearer {create_access_token(payload)}"
    }


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


SURVEILLANCE_PATHS = (
    "/api/v1/surveillance/chw/summary",
    "/api/v1/surveillance/chw/heatmap",
    "/api/v1/surveillance/chw/overrides",
    "/api/v1/surveillance/chw-vs-dhis2",
)


@pytest.mark.asyncio
async def test_surveillance_requires_auth(client: AsyncClient):
    for path in SURVEILLANCE_PATHS:
        response = await client.get(path)
        assert response.status_code == 401, path


@pytest.mark.asyncio
async def test_surveillance_forbids_chw_role(client: AsyncClient):
    headers = _token("chw", chw_id="chw-test")
    for path in SURVEILLANCE_PATHS:
        response = await client.get(path, headers=headers)
        assert response.status_code == 403, path


@pytest.mark.asyncio
async def test_summary_shape(client: AsyncClient):
    response = await client.get(
        SURVEILLANCE_PATHS[0], headers=_token("mohp")
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) >= {
        "visits_this_week",
        "fever_clusters",
        "danger_referrals",
        "weekly_trend",
        "source_meta",
    }
    meta = body["source_meta"]
    assert meta["source"] == "chw"
    assert meta["freshness_score"] in {"live", "recent", "stale", "historic"}


@pytest.mark.asyncio
async def test_heatmap_cells_carry_null_risk_when_no_visits(client: AsyncClient):
    response = await client.get(
        "/api/v1/surveillance/chw/heatmap", headers=_token("dho")
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) >= {"cells", "max_visit_count", "source_meta"}
    for cell in body["cells"]:
        assert set(cell) >= {
            "ta_id",
            "ta_name",
            "district_name",
            "visit_count",
            "risk_score",
        }
        if cell["visit_count"] == 0:
            assert cell["risk_score"] is None


@pytest.mark.asyncio
async def test_overrides_shape(client: AsyncClient):
    response = await client.get(
        "/api/v1/surveillance/chw/overrides", headers=_token("phim")
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["overrides"], list)
    for row in body["overrides"]:
        assert set(row) >= {"reason_key", "count", "prev_count", "trend", "districts"}


@pytest.mark.asyncio
async def test_chw_vs_dhis2_is_honest_about_missing_integration(client: AsyncClient):
    response = await client.get(
        SURVEILLANCE_PATHS[3], headers=_token("mohp")
    )
    assert response.status_code == 200
    body = response.json()
    assert body["dhis2_connected"] is False
    assert body["note"]
    for row in body["rows"]:
        assert row["dhis2_malaria"] is None
        assert row["gap"] is None
        assert isinstance(row["chw_fever"], int)
