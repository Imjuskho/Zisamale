"""Tests for expanded API features: ML predictions, uploads, exports, health,
integrations (DHIS2/LMIS), circuit breaker and alert delivery."""

from __future__ import annotations

import asyncio
import json
import time as time_module
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.alerts.delivery import AlertDeliveryService
from app.auth import create_access_token
from app.integrations.circuit_breaker import (
    CircuitBreaker,
    CircuitOpenError,
    CircuitState,
    circuit_breaker,
)
from app.integrations.dhis2 import DHIS2Client, DHIS2Error
from app.main import app


def _headers(role: str) -> dict[str, str]:
    token = create_access_token({"sub": f"{role}-test", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# --- Health endpoint ---

@pytest.mark.asyncio
async def test_health_endpoint_has_all_fields(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "uptime_seconds" in data
    assert data["version"] == "0.2.0"


@pytest.mark.asyncio
async def test_health_checks_database(client: AsyncClient):
    response = await client.get("/health")
    data = response.json()
    db_status = data["checks"]["database"]
    assert db_status == "ok" or db_status.startswith("error:")


# --- Root endpoint ---

@pytest.mark.asyncio
async def test_root_includes_websocket_info(client: AsyncClient):
    response = await client.get("/")
    data = response.json()
    assert "websocket" in data
    assert data["websocket"] == "/ws/alerts"


# --- ML Predictions ---

@pytest.mark.asyncio
async def test_pregnancy_risk_basic(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={},
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_category" in data
    assert "top_factors" in data
    assert data["model_version"] == "rule-based-v1"
    assert data["risk_category"] in ("low", "medium", "high", "critical")


@pytest.mark.asyncio
async def test_pregnancy_risk_high_risk_factors(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={
            "age": 16,
            "parity": 0,
            "prior_stillbirths": 1,
            "bp_systolic": 160,
            "bp_diastolic": 95,
            "hemoglobin": 7.0,
            "distance_to_facility_km": 25,
        },
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 6.0
    assert data["risk_category"] in ("high", "critical")
    assert len(data["top_factors"]) >= 3


@pytest.mark.asyncio
async def test_pregnancy_risk_low(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={
            "age": 25,
            "parity": 2,
            "bp_systolic": 110,
            "bp_diastolic": 70,
            "hemoglobin": 12.0,
        },
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] <= 3.0
    assert data["risk_category"] == "low"


@pytest.mark.asyncio
async def test_pregnancy_risk_validates_age(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={"age": 5},
        headers=_headers("chw"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_pregnancy_risk_validates_bp(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={"bp_systolic": 300},
        headers=_headers("chw"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_child_risk_basic(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/child-risk",
        json={},
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_category" in data


@pytest.mark.asyncio
async def test_child_risk_danger_signs(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/child-risk",
        json={
            "age_months": 8,
            "danger_signs": ["inability_to_drink", "convulsions"],
            "has_fever": True,
        },
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 5.0
    assert data["risk_category"] in ("medium", "high", "critical")


@pytest.mark.asyncio
async def test_child_risk_severe_malnutrition(client: AsyncClient):
    response = await client.post(
        "/api/v1/ml/predict/child-risk",
        json={"muac": 10.5, "age_months": 12},
        headers=_headers("chw"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 3.0


# --- Export endpoints ---

@pytest.mark.asyncio
async def test_export_alerts_csv(client: AsyncClient):
    response = await client.get(
        "/api/v1/district/test-district/export/alerts",
        headers=_headers("mohp"),
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    assert "alert_id" in content
    assert "disease" in content


@pytest.mark.asyncio
async def test_export_surveillance_csv(client: AsyncClient):
    response = await client.get(
        "/api/v1/district/test-district/export/surveillance",
        headers=_headers("mohp"),
    )
    assert response.status_code == 200
    content = response.text
    assert "week" in content
    assert "cases" in content


# --- Upload endpoint ---

@pytest.mark.asyncio
async def test_upload_stats(client: AsyncClient):
    response = await client.get("/api/v1/uploads/stats", headers=_headers("chw"))
    assert response.status_code == 200
    data = response.json()
    assert "total_files" in data
    assert "total_size_bytes" in data


# --- Circuit breaker ---


@pytest.mark.asyncio
async def test_circuit_breaker_transitions_closed_open_half_open_closed():
    breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=0.05, name="t1")
    assert breaker.state is CircuitState.CLOSED

    async def fail() -> None:
        raise RuntimeError("boom")

    async def ok() -> str:
        return "fine"

    for _ in range(3):
        with pytest.raises(RuntimeError):
            await breaker.call(fail)
    assert breaker.failure_count == 3
    assert breaker.state is CircuitState.OPEN

    # While OPEN, calls fail fast without executing the function.
    executed = False

    async def probe() -> None:
        nonlocal executed
        executed = True

    with pytest.raises(CircuitOpenError):
        await breaker.call(probe)
    assert not executed

    # After the recovery timeout the next call is a HALF_OPEN trial.
    await asyncio.sleep(0.06)
    assert breaker.state is CircuitState.HALF_OPEN
    assert await breaker.call(ok) == "fine"
    assert breaker.state is CircuitState.CLOSED
    assert breaker.failure_count == 0


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_failure_reopens():
    breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=0.05, name="t2")

    async def fail() -> None:
        raise RuntimeError("boom")

    for _ in range(2):
        with pytest.raises(RuntimeError):
            await breaker.call(fail)
    assert breaker.state is CircuitState.OPEN

    await asyncio.sleep(0.06)
    with pytest.raises(RuntimeError):
        await breaker.call(fail)
    assert breaker.state is CircuitState.OPEN
    assert breaker.last_failure_time is not None


@pytest.mark.asyncio
async def test_circuit_breaker_decorator_shares_named_breaker():
    state = {"calls": 0}

    @circuit_breaker(name="decorator-test", failure_threshold=2, recovery_timeout=60)
    async def flaky() -> str:
        state["calls"] += 1
        raise ValueError("nope")

    for _ in range(2):
        with pytest.raises(ValueError):
            await flaky()
    with pytest.raises(CircuitOpenError):
        await flaky()
    assert state["calls"] == 2  # third call was blocked by the open circuit


# --- DHIS2 client (mocked httpx) ---


def _dhis2_client(handler, **kwargs) -> DHIS2Client:
    defaults: dict = {
        "base_url": "https://dhis2.example",
        "username": "svc",
        "password": "pw",
        "cache_dir": None,
        "retry_delays": [0.0] * len(DHIS2Client.RETRY_DELAYS),
    }
    defaults.update(kwargs)
    cache_dir = defaults.pop("cache_dir")
    if cache_dir is not None:
        defaults["cache_dir"] = cache_dir
    return DHIS2Client(transport=httpx.MockTransport(handler), **defaults)


def test_dhis2_fetch_analytics_paginates(tmp_path):
    calls: list[httpx.Request] = []
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        page = int(request.url.params.get("page", "1"))
        if page == 1:
            return httpx.Response(
                200,
                json={
                    "dataValues": [
                        {
                            "dataElement": "malaria_confirmed",
                            "orgUnit": "OU-MW-1",
                            "period": "2026W12",
                            "value": "310",
                        }
                    ],
                    "pager": {"page": 1, "pageCount": 2, "total": 2},
                },
            )
        return httpx.Response(
            200,
            json={
                "dataValues": [
                    {
                        "dataElement": "diarrhea_cases",
                        "orgUnit": "OU-MW-1",
                        "period": "2026W12",
                        "value": "12",
                    }
                ],
                "pager": {"page": 2, "pageCount": 2, "total": 2},
            },
        )

    client = _dhis2_client(handler, cache_dir=tmp_path)

    async def run() -> list[dict]:
        try:
            return await client.fetch_analytics(
                org_units=["OU-MW-1"],
                data_elements=["malaria_confirmed", "diarrhea_cases"],
                periods="2026W12",
            )
        finally:
            await client.aclose()

    rows = asyncio.run(run())
    assert len(calls) == 2
    assert [int(r.url.params["page"]) for r in calls] == [1, 2]
    assert {row["data_element"] for row in rows} == {
        "malaria_confirmed",
        "diarrhea_cases",
    }
    malaria = next(r for r in rows if r["data_element"] == "malaria_confirmed")
    assert malaria["org_unit"] == "OU-MW-1"
    assert malaria["period"] == "2026W12"
    assert int(float(malaria["value"])) == 310


def test_dhis2_retries_on_503_then_succeeds(tmp_path):
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) < 3:
            return httpx.Response(503, text="overloaded")
        return httpx.Response(
            200,
            json={"dataValues": [], "pager": {"pageCount": 1}},
        )

    client = _dhis2_client(handler, cache_dir=tmp_path)

    async def run() -> list[dict]:
        try:
            return await client.fetch_analytics(
                org_units=["OU"], data_elements=["dx"], periods="2026W10"
            )
        finally:
            await client.aclose()

    rows = asyncio.run(run())
    assert len(attempts) == 3
    assert rows == []
    assert client.breaker.success_count >= 1


def test_dhis2_exhausts_retries_and_raises(tmp_path):
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        return httpx.Response(504, text="gateway timeout")

    client = _dhis2_client(handler, cache_dir=tmp_path)

    async def run() -> None:
        try:
            await client.request("GET", "/system/info.json")
        finally:
            await client.aclose()

    with pytest.raises(DHIS2Error):
        asyncio.run(run())
    assert len(attempts) == len(DHIS2Client.RETRY_DELAYS) + 1
    assert client.breaker.failure_count == 1


def test_dhis2_filesystem_cache_hit_and_expiry(tmp_path):
    request_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        request_count["n"] += 1
        return httpx.Response(
            200,
            json={"organisationUnits": [{"id": "OU-9", "name": "Chilomoni"}]},
        )

    client = _dhis2_client(
        handler, cache_dir=tmp_path, cache_ttl_seconds=3600
    )

    async def run_twice() -> tuple[dict, dict]:
        try:
            first = await client.request(
                "GET",
                "/organisationUnits.json",
                params={"filter": "parent.id:eq:OU-ROOT"},
                use_cache=True,
            )
            second = await client.request(
                "GET",
                "/organisationUnits.json",
                params={"filter": "parent.id:eq:OU-ROOT"},
                use_cache=True,
            )
            return first, second
        finally:
            await client.aclose()

    first, second = asyncio.run(run_twice())
    assert request_count["n"] == 1  # second call served from cache
    assert first == second
    assert second["organisationUnits"][0]["id"] == "OU-9"

    # Expired entry is evicted and refetched.
    key = client._cache_key(
        "GET",
        client._api("/organisationUnits.json"),
        {"filter": "parent.id:eq:OU-ROOT"},
    )
    path = tmp_path / f"{key}.json"
    envelope = {"created_at": 0, "expires_at": time_module.time() - 1, "payload": {}}
    path.write_text(json.dumps(envelope))
    assert client._cache_get(key) is None


def test_dhis2_push_events_validates_and_posts(tmp_path):
    posted: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        posted.append(body)
        return httpx.Response(
            200,
            json={
                "status": "SUCCESS",
                "importSummaries": [
                    {
                        "status": "SUCCESS",
                        "importCount": {"imported": 2, "updated": 0, "ignored": 0},
                    }
                ],
            },
        )

    client = _dhis2_client(handler, cache_dir=tmp_path)

    events = [
        {
            "program": "PROG-SURVEILLANCE",
            "orgUnit": "OU-MW-1",
            "eventDate": "2026-03-20",
            "dataValues": [{"dataElement": "malaria_confirmed", "value": 310}],
        }
    ]

    async def run() -> dict:
        try:
            return await client.push_events(events)
        finally:
            await client.aclose()

    summary = asyncio.run(run())
    assert summary["status"] == "ok"
    assert summary["imported"] == 2
    assert posted[0]["events"][0]["program"] == "PROG-SURVEILLANCE"

    # Missing required fields rejected before any HTTP traffic.
    with pytest.raises(ValueError):
        asyncio.run(_push_bad(client))


async def _push_bad(client: DHIS2Client) -> None:
    await client.push_events([{"orgUnit": "OU"}])


def test_dhis2_fetch_org_units_sends_parent_filter(tmp_path):
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["filter"] = request.url.params.get("filter")
        return httpx.Response(
            200,
            json={"organisationUnits": [{"id": "OU-C1", "name": "Ndirande"}]},
        )

    client = _dhis2_client(handler, cache_dir=tmp_path)

    async def run() -> list[dict]:
        try:
            return await client.fetch_org_units(parent_id="OU-ROOT")
        finally:
            await client.aclose()

    units = asyncio.run(run())
    assert seen["filter"] == "parent.id:eq:OU-ROOT"
    assert units[0]["id"] == "OU-C1"


# --- Alert delivery fan-out ---


class _FakeWSManager:
    def __init__(self) -> None:
        self.broadcasts: list[dict] = []

    async def broadcast_alert(self, alert: dict) -> None:
        self.broadcasts.append(alert)


@pytest.mark.asyncio
async def test_alert_delivery_fans_out_to_all_channels():

    ws = _FakeWSManager()
    service = AlertDeliveryService(ws_manager=ws)
    alert = {
        "alert_id": "a-123",
        "disease": "malaria",
        "district_id": "district-mw-1",
        "ta_name": "Ndirande",
        "alert_level": "red",
        "predicted_cases": 310,
        "recommended_actions": ["Activate DRRT"],
        "generated_at": datetime.now(UTC).isoformat(),
        "status": "pending",
    }

    receipts = await service.deliver_alert(
        alert,
        channels=["websocket", "sms", "email"],
        recipients={"phone": "+265991000111", "email": "dho@mw.gov"},
    )

    by_channel = {r.channel: r for r in receipts}
    assert set(by_channel) == {"websocket", "sms", "email"}
    assert all(r.status == "sent" for r in receipts)
    assert by_channel["sms"].recipient == "+265991000111"
    assert by_channel["email"].recipient == "dho@mw.gov"
    assert len(ws.broadcasts) == 1
    assert ws.broadcasts[0]["district_id"] == "district-mw-1"
    stored = {r.channel: r.status for r in service.get_deliveries("a-123")}
    assert stored == {
        "websocket": "sent",
        "sms": "sent",
        "email": "sent",
    }


@pytest.mark.asyncio
async def test_alert_delivery_tracks_manual_receipts():

    service = AlertDeliveryService(ws_manager=_FakeWSManager())
    receipt = service.track_delivery(
        "a-999", "ivr", "sent", recipient="+265888", detail="ivr-call-placed"
    )
    assert receipt.alert_id == "a-999"
    assert receipt.status == "sent"
    deliveries = service.get_deliveries("a-999")
    assert len(deliveries) == 1
    assert deliveries[0].channel == "ivr"


@pytest.mark.asyncio
async def test_escalate_alert_after_wait_window():

    ws = _FakeWSManager()
    service = AlertDeliveryService(ws_manager=ws)
    stale_time = datetime.now(UTC) - timedelta(hours=6)
    alert = {
        "alert_id": "a-stale",
        "disease": "cholera",
        "district_id": "district-mw-2",
        "alert_level": "red",
        "generated_at": stale_time.isoformat(),
        "status": "pending",
    }

    result = await service.escalate_alert(
        "a-stale",
        hours_waiting=4,
        alert=alert,
        escalation_recipients={"phone": "+265991222333", "email": "phim@mw.gov"},
    )
    assert result["escalated"] is True
    assert set(result["channels"]) == {"sms", "email"}
    # Second attempt must not double-escalate.
    again = await service.escalate_alert(
        "a-stale",
        hours_waiting=4,
        alert=alert,
        escalation_recipients={"phone": "+265991222333"},
    )
    assert again["escalated"] is False
    assert again["reason"] == "already_escalated"


@pytest.mark.asyncio
async def test_escalate_skips_recent_or_acknowledged_alerts():

    service = AlertDeliveryService(ws_manager=_FakeWSManager())
    recent = {
        "alert_id": "a-fresh",
        "generated_at": datetime.now(UTC).isoformat(),
        "status": "pending",
    }
    fresh = await service.escalate_alert("a-fresh", hours_waiting=4, alert=recent)
    assert fresh["escalated"] is False
    assert fresh["reason"] == "within_window"

    acked = {
        "alert_id": "a-acked",
        "generated_at": (datetime.now(UTC) - timedelta(hours=9)).isoformat(),
        "status": "acknowledged",
    }
    done = await service.escalate_alert("a-acked", hours_waiting=4, alert=acked)
    assert done["escalated"] is False
    assert done["reason"] == "already_acknowledged"

    unknown = await service.escalate_alert("does-not-exist")
    assert unknown["escalated"] is False
    assert unknown["reason"] == "unknown_alert"


# --- Integration endpoints ---


@pytest.mark.asyncio
async def test_integration_status_endpoint(client: AsyncClient):
    response = await client.get(
        "/api/v1/integrations/status", headers=_headers("mohp")
    )
    assert response.status_code == 200
    data = response.json()
    integrations = data["integrations"]
    assert set(integrations) == {"dhis2", "lmis", "ichis"}
    assert integrations["dhis2"]["circuit_state"] in {"closed", "open", "half_open"}
    assert "circuit_breakers" in data
    assert isinstance(data["circuit_breakers"], list)


@pytest.mark.asyncio
async def test_integration_status_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/integrations/status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dhis2_status_endpoint(client: AsyncClient):
    response = await client.get(
        "/api/v1/integrations/dhis2/status", headers=_headers("phim")
    )
    assert response.status_code == 200
    data = response.json()
    assert data["integration"] == "dhis2"
    assert "configured" in data
    assert "last_sync_at" in data
    assert data["circuit_breaker"]["failure_threshold"] >= 1


@pytest.mark.asyncio
async def test_dhis2_sync_unconfigured_returns_503(client: AsyncClient):
    response = await client.post(
        "/api/v1/integrations/dhis2/sync",
        json={"district_id": "district-mw-1"},
        headers=_headers("mohp"),
    )
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


@pytest.mark.asyncio
async def test_lmis_upload_parses_csv(client: AsyncClient):
    csv_content = (
        "facility_id,commodity_code,commodity_name,stock_on_hand,"
        "average_monthly_consumption,last_order_date\n"
        "FAC-1,LARIA24,LA 24s,120,90,2026-07-01\n"
        "FAC-1,ZINC20,Zinc 20s,-5,30,2026-07-01\n"
        "FAC-2,LARIA24,LA 24s,10,300,2026-01-15\n"
    )
    response = await client.post(
        "/api/v1/integrations/lmis/upload",
        files={"file": ("stock.csv", csv_content.encode(), "text/csv")},
        headers=_headers("phim"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["rows_parsed"] == 3
    assert data["rows_with_anomalies"] >= 1
    flagged_rows = {entry["row_number"] for entry in data["anomaly_rows"]}
    assert 3 in flagged_rows  # negative stock row


@pytest.mark.asyncio
async def test_lmis_upload_rejects_non_csv(client: AsyncClient):
    response = await client.post(
        "/api/v1/integrations/lmis/upload",
        files={"file": ("stock.xlsx", b"binary", "application/octet-stream")},
        headers=_headers("phim"),
    )
    assert response.status_code == 422
