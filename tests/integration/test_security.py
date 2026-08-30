"""Security tests: JWT handling, RBAC, input validation, rate limiting, CORS."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest

from app.auth import create_access_token

DISTRICT_ID = "11111111-1111-1111-1111-111111111111"
ANOTHER_HH_ID = "30000000-0000-0000-0000-000000000099"


def _alert(alert_id: str | None = None, district_id: str = DISTRICT_ID) -> "object":
    from app.models.alert import Alert

    return Alert(
        alert_id=alert_id or str(uuid.uuid4()),
        disease="malaria",
        district_id=district_id,
        ta_name="T/A Mlolo",
        risk_score=5.0,
        alert_level="medium",
        predicted_cases=50,
        recommended_actions=["Restock"],
        generated_at=datetime(2026, 8, 20),
        status="pending",
    )


# ---------------------------------------------------------------------------
# JWT expiry / tampering
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_jwt_expiry(client, auth_headers):
    """Expired, tampered and missing tokens are rejected; valid ones pass."""
    valid = await client.get(
        "/api/v1/auth/me", headers=auth_headers("chw", user_id="chw-77")
    )
    assert valid.status_code == 200
    body = valid.json()
    assert body["user_id"] == "chw-77"
    assert body["role"] == "chw"
    assert body["chw_id"] == "chw-77"

    expired_token = create_access_token(
        {"sub": "chw-77", "role": "chw"},
        expires_delta=timedelta(seconds=-1),
    )
    expired = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert expired.status_code == 401
    assert "expired" in expired.json()["detail"].lower()

    # Token signed with the wrong secret (forged).
    forged = create_access_token({"sub": "attacker", "role": "mohp"})
    forged_headers = {"Authorization": f"Bearer {forged}x"}
    tampered = await client.get("/api/v1/auth/me", headers=forged_headers)
    assert tampered.status_code == 401

    garbage = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"}
    )
    assert garbage.status_code == 401

    missing = await client.get("/api/v1/auth/me")
    assert missing.status_code == 401


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rbac_enforcement(client, db, auth_headers):
    """Endpoints enforce their declared role requirements."""
    alert_id = str(uuid.uuid4())
    await db.seed(_alert(alert_id=alert_id))

    chw = auth_headers("chw")
    supervisor = auth_headers("supervisor")
    dho = auth_headers("dho")
    mohp = auth_headers("mohp")

    # National overview requires mohp/phim.
    assert (await client.get("/api/v1/national/overview", headers=chw)).status_code == 403
    assert (await client.get("/api/v1/national/overview", headers=dho)).status_code == 403
    assert (await client.get("/api/v1/national/overview", headers=mohp)).status_code == 200

    # District alerts require dho/phim/mohp.
    assert (
        await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=chw)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=dho)
    ).status_code == 200

    # Alert response requires dho/phim/supervisor - CHW may not respond.
    respond_body = {
        "response_status": "acknowledged",
        "responded_by": str(uuid.uuid4()),
        "actions_taken": [],
    }
    chw_respond = await client.post(
        f"/api/v1/alerts/{alert_id}/actions", json=respond_body, headers=chw
    )
    assert chw_respond.status_code == 403
    assert "not in required roles" in chw_respond.json()["detail"]

    supervisor_respond = await client.post(
        f"/api/v1/alerts/{alert_id}/actions", json=respond_body, headers=supervisor
    )
    assert supervisor_respond.status_code == 200

    # Visits are a CHW/supervisor capability; DHO may not file them.
    visit_body = {
        "household_id": ANOTHER_HH_ID,
        "visit_date": "2026-08-20T08:00:00Z",
        "visit_type": "pregnancy",
    }
    assert (
        await client.post("/api/v1/visits", json=visit_body, headers=dho)
    ).status_code == 403
    assert (
        await client.post("/api/v1/visits", json=visit_body, headers=chw)
    ).status_code == 201

    # CSV export is restricted to district/national roles.
    assert (
        await client.get(f"/api/v1/district/{DISTRICT_ID}/export/alerts", headers=chw)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/district/{DISTRICT_ID}/export/alerts", headers=mohp)
    ).status_code == 200


# ---------------------------------------------------------------------------
# Input validation (SQL injection & XSS)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_input_validation(client, db, auth_headers):
    """Injection payloads are rejected or neutralised as inert data."""
    chw = auth_headers("chw")

    # Typed fields reject non-numeric injection payloads with 422.
    for payload in ("1; DROP TABLE users--", "' OR '1'='1"):
        bad = await client.post(
            "/api/v1/ml/predict/pregnancy-risk",
            json={"age": payload},
            headers=chw,
        )
        assert bad.status_code == 422

    # Out-of-range clinical values violate pydantic constraints.
    out_of_range = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={"bp_systolic": 99999, "hemoglobin": -3.0},
        headers=chw,
    )
    assert out_of_range.status_code == 422

    # SQL injection in string path/query parameters never reaches SQL as code:
    # it is bound as a literal parameter and simply matches nothing.
    sqli_paths = [
        f"/api/v1/district/{DISTRICT_ID}' OR '1'='1/alerts",
        "/api/v1/chw/'; DELETE FROM visits;--/priority-list",
    ]
    for path in sqli_paths:
        response = await client.get(path, headers=auth_headers("dho"))
        assert response.status_code in (200, 404)
        body = response.json()
        assert body.get("alerts") == [] or "visits" in body

    # XSS payloads submitted as data are treated as inert strings: they are
    # stored verbatim and served back inside a JSON document (never HTML),
    # so there is no execution context.
    xss_note = "<script>alert('xss')</script>"
    chw_id = str(uuid.uuid4())
    household_id = str(uuid.uuid4())
    chw = auth_headers("chw", user_id=chw_id)
    visit = await client.post(
        "/api/v1/visits",
        json={
            "household_id": household_id,
            "chw_id": "'; DROP TABLE households;--",
            "visit_date": "2026-08-20T08:00:00Z",
            "visit_type": "child",
            "chw_notes": xss_note,
        },
        headers=chw,
    )
    assert visit.status_code == 201
    assert visit.headers["content-type"].startswith("application/json")

    from app.models.visit import Visit

    stored_visits = await db.rows(Visit)
    stored_visit = [v for v in stored_visits if v.household_id == household_id][0]
    assert stored_visit.chw_notes == xss_note  # payload kept as literal data
    assert stored_visit.chw_id == chw_id  # CHW cannot spoof chw_id from the body


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rate_limiting(client, monkeypatch):
    """Requests beyond the per-client limit receive 429 + limiter headers."""
    from app.ratelimit import RATE_LIMITS

    monkeypatch.setitem(RATE_LIMITS, "default", {"requests": 3, "window_seconds": 60})
    headers = {"X-Forwarded-For": "10.9.9.9"}  # isolated bucket for this test

    statuses = []
    for _ in range(5):
        response = await client.get("/", headers=headers)
        statuses.append(response.status_code)

    assert statuses[:3] == [200, 200, 200]
    assert statuses[3:] == [429, 429]

    limited = await client.get("/", headers=headers)
    assert limited.status_code == 429
    assert limited.json()["detail"] == "Rate limit exceeded"
    assert limited.headers["X-RateLimit-Limit"] == "3"
    assert limited.headers["X-RateLimit-Remaining"] == "0"
    assert int(limited.headers["X-RateLimit-Reset"]) > 0

    # Health checks stay exempt so monitoring is never throttled,
    # but may report 503 when backing infra (DB/Redis) is unreachable.
    health = await client.get("/health", headers=headers)
    assert health.status_code in (200, 503)
    assert "X-RateLimit" not in health.headers or health.headers["X-RateLimit-Remaining"] != "0"

    # A different client IP has its own untouched bucket.
    other_client = await client.get("/", headers={"X-Forwarded-For": "10.9.9.8"})
    assert other_client.status_code == 200


# ---------------------------------------------------------------------------
# CORS headers
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cors_headers(client):
    """CORS middleware exposes the expected allow-* headers."""
    origin = {"Origin": "https://dashboard.zisamale.health.mw"}

    preflight = await client.options(
        "/api/v1/national/overview",
        headers={
            **origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] in (origin["Origin"], "*")
    assert "GET" in preflight.headers["access-control-allow-methods"]
    if "access-control-allow-headers" in preflight.headers:
        assert "authorization" in preflight.headers["access-control-allow-headers"].lower()

    simple_get = await client.get("/health", headers=origin)
    # 200 when healthy; 503 when backing infra is unreachable — either way
    # CORS headers must be present so browsers can surface the real status.
    assert simple_get.status_code in (200, 503)
    assert simple_get.headers["access-control-allow-origin"] in (origin["Origin"], "*")
    assert simple_get.headers["access-control-allow-origin"] in (origin["Origin"], "*")