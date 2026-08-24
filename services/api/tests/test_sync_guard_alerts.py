"""Sync engine deepening: ADR-005 enforcement, scope guard, alert emission."""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.alerts.service import normalize_risk
from app.auth import create_access_token
from app.main import app

# Real seeded rows — households.chw_id / visits.* carry FKs to users.
CHW_ID = "f6a1f844-81e6-4331-a169-764676c36565"
SUPERVISOR_ID = "ac8cb4bc-f349-4aa9-85e5-0e6ded5a02e2"
FACILITY_ID = "259c6b52-7ded-47c3-981f-09e250608d02"



def _token(role: str = "chw", chw_id: str = CHW_ID) -> dict[str, str]:
    claims = {"sub": chw_id if role == "chw" else f"{role}-x", "role": role}
    if role == "chw":
        claims["chw_id"] = chw_id
    return {"Authorization": f"Bearer {create_access_token(claims)}"}


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _register_household(client: AsyncClient, household_id: str) -> None:
    response = await client.post(
        "/api/v1/households/batch",
        headers=_token(),
        json={"households": [{
            "household_id": household_id,
            "gps_lat": -13.976541,
            "gps_lon": 33.776542,
            "village_name": "Mkhoma",
        }]},
    )
    assert response.status_code == 200
    assert response.json()["created"] == 1, f"register failed: {response.json()}"


@pytest.mark.asyncio
async def test_gps_coarsened_at_both_sync_boundaries(client: AsyncClient):
    """ADR-005 §1: exact coordinates never persist via device sync paths."""
    household_id = str(uuid.uuid4())
    await _register_household(client, household_id)

    visit_id = str(uuid.uuid4())
    response = await client.post(
        "/api/v1/chw/sync",
        headers=_token(),
        json={
            "device_id": "device-x",
            "chw_name": "Test CHW",
            "chw_id": CHW_ID,
            "visits": [{
                "visit_id": visit_id,
                "household_id": household_id,
                "visit_date": "2026-08-24T09:30:00Z",
                "visit_type": "routine",
                "gps_lat": -13.971234,
                "gps_lon": 33.779876,
            }],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["visits_created"] == 1
    assert body["conflicts"] == []

    from sqlalchemy import text
    from app.database import engine
    async with engine.connect() as conn:
        hh = (
            await conn.execute(
                text("SELECT gps_lat, gps_lon FROM households WHERE household_id = :i"),
                {"i": household_id},
            )
        ).one()
        vv = (
            await conn.execute(
                text("SELECT gps_lat, gps_lon FROM visits WHERE visit_id = :i"),
                {"i": visit_id},
            )
        ).one()
    assert (round(float(hh.gps_lat), 2), round(float(hh.gps_lon), 2)) == (-13.98, 33.78)
    assert (round(float(vv.gps_lat), 2), round(float(vv.gps_lon), 2)) == (-13.97, 33.78)


@pytest.mark.asyncio
async def test_override_without_reason_fails_only_that_item(client: AsyncClient):
    """ADR-005 §3: reasonless overrides are rejected per-item, not batch-fatal."""
    household_id = str(uuid.uuid4())
    await _register_household(client, household_id)

    good, bad = str(uuid.uuid4()), str(uuid.uuid4())
    response = await client.post(
        "/api/v1/chw/sync",
        headers=_token(),
        json={
            "device_id": "device-x",
            "chw_name": "Test CHW",
            "chw_id": CHW_ID,
            "visits": [
                {
                    "visit_id": good,
                    "household_id": household_id,
                    "visit_date": "2026-08-24",
                    "chw_override": True,
                    "chw_override_reason": "No oedema observed this week",
                },
                {
                    "visit_id": bad,
                    "household_id": household_id,
                    "visit_date": "2026-08-24",
                    "chw_override": True,
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["visits_created"] == 1
    assert [c["id"] for c in body["conflicts"]] == [bad]
    assert "chw_override_reason" in body["conflicts"][0]["reason"]


@pytest.mark.asyncio
async def test_bad_visit_date_becomes_failure_receipt(client: AsyncClient):
    household_id = str(uuid.uuid4())
    await _register_household(client, household_id)

    response = await client.post(
        "/api/v1/chw/sync",
        headers=_token(),
        json={
            "device_id": "device-x",
            "chw_name": "Test CHW",
            "chw_id": CHW_ID,
            "visits": [{
                "visit_id": str(uuid.uuid4()),
                "household_id": household_id,
                "visit_date": "not-a-date",
            }],
        },
    )
    body = response.json()
    assert body["visits_created"] == 0
    assert len(body["conflicts"]) == 1
    assert "invalid date" in body["conflicts"][0]["reason"]


@pytest.mark.asyncio
async def test_body_chw_id_ignored_for_chw_tokens(client: AsyncClient):
    """Catchment identity comes from the token; the payload cannot spoof it."""
    household_id = str(uuid.uuid4())
    visit_id = str(uuid.uuid4())

    hh = await client.post(
        "/api/v1/households/batch",
        headers=_token(),
        json={"chw_id": SUPERVISOR_ID, "households": [{"household_id": household_id}]},
    )
    assert hh.json()["created"] == 1

    vv = await client.post(
        "/api/v1/chw/sync",
        headers=_token(),
        json={
            "device_id": "device-x",
            "chw_name": "Test CHW",
            "chw_id": SUPERVISOR_ID,
            "visits": [{
                "visit_id": visit_id,
                "household_id": household_id,
                "visit_date": "2026-08-24",
            }],
        },
    )
    assert vv.status_code == 200

    from sqlalchemy import text
    from app.database import engine
    async with engine.connect() as conn:
        hh_row = (
            await conn.execute(
                text("SELECT chw_id FROM households WHERE household_id = :i"),
                {"i": household_id},
            )
        ).one()
        v_row = (
            await conn.execute(
                text("SELECT chw_id FROM visits WHERE visit_id = :i"),
                {"i": visit_id},
            )
        ).one()
    assert str(hh_row.chw_id) == CHW_ID
    assert str(v_row.chw_id) == CHW_ID


@pytest.mark.asyncio
async def test_critical_stockout_alert_normalized_and_idempotent(client: AsyncClient):
    # Unique commodity per run keeps the day-grained idempotency key fresh.
    report = {
        "facility_id": FACILITY_ID,
        "commodity_name": f"LA 1x6 {uuid.uuid4().hex[:8]}",
        "quantity_available": 0,
        "stockout_risk": "critical",
    }
    first = await client.post(
        "/api/v1/chw/sync", headers=_token(),
        json={"device_id": "d", "chw_name": "Test CHW", "chw_id": CHW_ID, "stock_reports": [report]},
    )
    second = await client.post(
        "/api/v1/chw/sync", headers=_token(),
        json={"device_id": "d", "chw_name": "Test CHW", "chw_id": CHW_ID, "stock_reports": [report]},
    )
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["stock_alerts_triggered"] == 1
    # Same commodity + facility + day replays into one idempotent alert.
    assert second.json()["stock_alerts_triggered"] == 0

    from sqlalchemy import text
    from app.database import engine
    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text("SELECT risk_score FROM alerts WHERE disease='stockout' AND risk_score >= 0.89"),
            )
        ).all()
    assert rows, "expected a stockout alert on the canonical 0-1 scale"
    assert all(float(r.risk_score) <= 1.0 for r in rows)


def test_normalize_risk_mixed_scales_sort_consistently():
    """The old bug: ingest stored 0–10 while sync stored 0–1."""
    assert normalize_risk(8.6, scale=10) == 0.86
    assert normalize_risk(0.86) == 0.86
    assert normalize_risk(12.0, scale=10) == 1.0
    assert normalize_risk(-2, scale=10) == 0.0
