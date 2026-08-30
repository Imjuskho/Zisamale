"""API contract tests: response shapes that clients depend on must not drift.

These lock down the public contract of the Zisamale API - health probes, ML
prediction payloads, pagination envelopes and CSV exports - so that dashboards
and the Android app can rely on stable field names and types.
"""

from __future__ import annotations

import csv
import io

import pytest

DISTRICT_ID = "11111111-1111-1111-1111-111111111111"
VALID_CATEGORIES = {"low", "medium", "high", "critical"}


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_health_endpoint_contract(client):
    response = await client.get("/health")
    # 200 when healthy, 503 when ≥1 backing dependency is unreachable
    # (redis is typically unconfigured in the integration suite).
    assert response.status_code in (200, 503)
    assert response.headers["content-type"].startswith("application/json")

    body = response.json()
    # Required top-level fields with stable types.
    assert set(body) >= {
        "status",
        "version",
        "environment",
        "uptime_seconds",
        "checks",
    }
    assert body["status"] in ("healthy", "degraded")
    if response.status_code == 503:
        assert body["status"] == "degraded"
    assert isinstance(body["version"], str) and body["version"].count(".") == 2
    assert isinstance(body["environment"], str)
    assert isinstance(body["uptime_seconds"], (int, float))
    assert body["uptime_seconds"] >= 0

    checks = body["checks"]
    assert set(checks) == {"api", "database", "redis"}
    assert checks["api"] == "ok"
    for dependency in ("database", "redis"):
        value = checks[dependency]
        assert value == "ok" or value.startswith(("error:", "not_configured"))

    # The root index advertises the same version and navigation links.
    root = (await client.get("/")).json()
    assert root["version"] == body["version"]
    assert root["docs"] == "/docs"
    assert root["health"] == "/health"


# ---------------------------------------------------------------------------
# ML prediction endpoint
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_ml_prediction_contract(client, auth_headers):
    headers = auth_headers("chw")

    pregnancy = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={
            "age": 24,
            "parity": 0,
            "gravida": 1,
            "bp_systolic": 145,
            "bp_diastolic": 92,
            "hemoglobin": 7.5,
            "distance_to_facility_km": 18.0,
        },
        headers=headers,
    )
    assert pregnancy.status_code == 200
    body = pregnancy.json()
    assert set(body) == {"risk_score", "risk_category", "top_factors", "model_version"}
    assert isinstance(body["risk_score"], float)
    assert 0.0 <= body["risk_score"] <= 10.0
    assert body["risk_category"] in VALID_CATEGORIES
    assert isinstance(body["top_factors"], list)
    assert all(isinstance(factor, str) for factor in body["top_factors"])
    assert len(body["top_factors"]) <= 3
    assert isinstance(body["model_version"], str) and body["model_version"]

    child = await client.post(
        "/api/v1/ml/predict/child-risk",
        json={"age_months": 20, "muac": 11.0, "has_fever": True},
        headers=headers,
    )
    assert child.status_code == 200
    child_body = child.json()
    assert set(child_body) == set(body), "both predictors share one response schema"
    assert child_body["risk_score"] == 4.0  # MUAC < 11.5 (+3.0) + fever (+1.0)

    # Validation errors are reported through the standard error envelope.
    invalid = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={"age": 9},  # below ge=10 constraint
        headers=headers,
    )
    assert invalid.status_code == 422
    error = invalid.json()
    assert error["detail"][0]["loc"][-1] == "age"
    assert error["detail"][0]["type"].startswith("greater_than_equal")

    # Unauthenticated calls are rejected before any scoring happens.
    assert (
        await client.post("/api/v1/ml/predict/child-risk", json={})
    ).status_code == 401


# ---------------------------------------------------------------------------
# Pagination envelope
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_pagination_contract():
    """Every paginated list response exposes the full pagination envelope."""
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.pagination import PaginatedResponse, paginate

    app = FastAPI()

    @app.get("/items")
    async def list_items(offset: int = 0, limit: int = 4):
        all_items = [{"id": i} for i in range(1, 11)]
        return paginate(all_items, offset=offset, limit=limit)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        first = await c.get("/items")
        second = await c.get("/items?offset=4&limit=4")
        last = await c.get("/items?offset=8&limit=4")

    required_fields = {"items", "total", "offset", "limit", "has_next", "has_previous"}

    page_one = first.json()
    assert set(page_one) == required_fields
    assert page_one["total"] == 10
    assert page_one["offset"] == 0
    assert page_one["limit"] == 4
    assert len(page_one["items"]) == 4
    assert page_one["has_next"] is True
    assert page_one["has_previous"] is False

    page_two = second.json()
    assert set(page_two) == required_fields
    assert [item["id"] for item in page_two["items"]] == [5, 6, 7, 8]
    assert page_two["has_next"] is True and page_two["has_previous"] is True

    page_last = last.json()
    assert len(page_last["items"]) == 2
    assert page_last["has_next"] is False and page_last["has_previous"] is True

    # The envelope model validates the same shape for typed clients.
    validated = PaginatedResponse(**page_two)
    assert validated.total == 10
    assert len(validated.items) == 4


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_csv_export_contract(client, auth_headers):
    dho = auth_headers("dho")

    surveillance = await client.get(
        f"/api/v1/district/{DISTRICT_ID}/export/surveillance", headers=dho
    )
    assert surveillance.status_code == 200
    assert surveillance.headers["content-type"].startswith("text/csv")
    assert "attachment" in surveillance.headers.get("content-disposition", "")
    assert f"surveillance_{DISTRICT_ID}.csv" in surveillance.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(surveillance.text)))
    header, data_rows = rows[0], rows[1:]
    assert header == [
        "week",
        "confirmed_cases",
        "suspected_cases",
        "rainfall_mm",
        "temperature_c",
        "humidity_pct",
    ]
    assert len(data_rows) == 26  # half a year of epi weeks
    assert all(len(row) == len(header) for row in data_rows)
    assert data_rows[0][0] == "2026-W01"

    alerts_export = await client.get(
        f"/api/v1/district/{DISTRICT_ID}/export/alerts", headers=dho
    )
    assert alerts_export.status_code == 200
    assert alerts_export.headers["content-type"].startswith("text/csv")
    alert_rows = list(csv.reader(io.StringIO(alerts_export.text)))
    assert alert_rows[0] == [
        "alert_id",
        "disease",
        "ta_name",
        "risk_score",
        "alert_level",
        "predicted_cases",
        "ci_lower",
        "ci_upper",
        "status",
        "generated_at",
    ]
    # Every data row matches the declared column count.
    assert all(len(row) == len(alert_rows[0]) for row in alert_rows[1:])
