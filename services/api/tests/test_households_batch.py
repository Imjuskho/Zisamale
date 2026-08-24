"""Household registry batch sync (M2 contract delta)."""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.auth import create_access_token
from app.main import app


def _chw_headers() -> dict[str, str]:
    # households.chw_id has an FK to users — use a seeded CHW identity.
    chw_id = "f6a1f844-81e6-4331-a169-764676c36565"
    token = create_access_token({"sub": chw_id, "role": "chw", "chw_id": chw_id})
    return {"Authorization": f"Bearer {token}"}


def _household(**overrides) -> dict:
    base = {
        "household_id": str(uuid.uuid4()),
        "village_name": "Mkhoma",
        "ta_name": "TA Chapananga",
        "household_size": 6,
        "water_source": "borehole",
        "gps_lat": -13.97,
        "gps_lon": 33.77,
    }
    base.update(overrides)
    return base




@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_household_batch_requires_auth(client: AsyncClient):
    response = await client.post(
        "/api/v1/households/batch",
        json={"households": [_household()]},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_household_batch_creates(client: AsyncClient):
    payload = _household()
    response = await client.post(
        "/api/v1/households/batch",
        headers=_chw_headers(),
        json={"device_id": "device-1", "households": [payload]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["created"] == 1
    assert body["processed"] == 1
    assert body["conflicts"] == []


@pytest.mark.asyncio
async def test_household_repush_is_update_not_duplicate(client: AsyncClient):
    """Same batch twice: first creates, second updates (client row pending→synced)."""
    payload = _household()
    first = await client.post(
        "/api/v1/households/batch",
        headers=_chw_headers(),
        json={"households": [payload]},
    )
    assert first.status_code == 200
    assert first.json()["created"] == 1

    second = await client.post(
        "/api/v1/households/batch",
        headers=_chw_headers(),
        json={
            "households": [{**payload, "village_name": "Mkhoma II"}]
        },
    )
    assert second.status_code == 200
    body = second.json()
    # Server row is now "synced" → flagged as conflict, not duplicated.
    assert body["conflicts"], "expected server-newer conflict on repush"
    assert body["conflicts"][0]["id"] == payload["household_id"]
