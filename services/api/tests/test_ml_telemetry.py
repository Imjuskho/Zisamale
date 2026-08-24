"""Edge model telemetry endpoint (M3 contract delta #3)."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.auth import create_access_token
from app.main import app


def _chw_headers() -> dict[str, str]:
    token = create_access_token({"sub": "chw-test", "role": "chw", "chw_id": "chw-test"})
    return {"Authorization": f"Bearer {token}"}




@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_telemetry_requires_auth(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/telemetry",
        json={"records": [{"kind": "pregnancy", "model_version": "edge-gbt-v3"}]},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_telemetry_accepts_batch(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/telemetry",
        headers=_chw_headers(),
        json={
            "records": [
                {
                    "kind": "pregnancy",
                    "model_version": "edge-gbt-v3",
                    "source": "bundled_model",
                    "inference_count": 12,
                    "fallback_count": 0,
                    "latency_ms_avg": 0.002,
                },
                {
                    "kind": "child",
                    "model_version": "rule-based-v1",
                    "source": "rule_based",
                    "inference_count": 4,
                    "fallback_count": 4,
                },
            ]
        },
    )
    assert response.status_code == 200
    assert response.json() == {"accepted": 2}


@pytest.mark.asyncio
async def test_telemetry_rejects_bad_kind(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/telemetry",
        headers=_chw_headers(),
        json={"records": [{"kind": "household", "model_version": "edge-gbt-v3"}]},
    )
    assert response.status_code == 422
