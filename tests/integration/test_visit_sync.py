"""Idempotent visit/referral sync and catchment-scoped priority lists."""

from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest

from app.models.child import Child
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.referral import Referral
from app.models.visit import Visit

CHW_ID = "chw-sync-001"


def _seed_catchment(db, chw_id: str = CHW_ID):
    household = Household(
        household_id=str(uuid.uuid4()),
        chw_id=chw_id,
        village_name="Mlolo",
        distance_to_facility_km=9.5,
        sync_status="synced",
    )
    pregnancy = Pregnancy(
        pregnancy_id=str(uuid.uuid4()),
        household_id=household.household_id,
        woman_name="Grace Phiri",
        risk_score=8.2,
        risk_category="high",
        is_active=True,
        next_visit_date=date.today() - timedelta(days=3),
        top_risk_factors=["Age under 18", "High systolic BP"],
    )
    child = Child(
        child_id=str(uuid.uuid4()),
        household_id=household.household_id,
        child_name="Mphatso Phiri",
        risk_score=3.1,
        risk_category="low",
        top_risk_factors=[],
    )
    db.seed(household, pregnancy, child)
    return household, pregnancy, child


@pytest.mark.asyncio
async def test_visit_sync_is_idempotent(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    household, pregnancy, _ = _seed_catchment(fake_db)
    visit_id = str(uuid.uuid4())
    payload = {
        "visit_id": visit_id,
        "household_id": household.household_id,
        "visit_date": "2026-08-20T09:30:00Z",
        "pregnancy_id": pregnancy.pregnancy_id,
        "visit_type": "pregnancy",
        "danger_signs": ["severe_bp"],
        "ai_recommendation": {"risk_score": 8.2, "risk_category": "high"},
    }

    first = await client.post("/api/v1/visits", json=payload, headers=chw)
    assert first.status_code == 201
    body = first.json()
    assert body["visit_id"] == visit_id
    assert body["created"] is True
    assert body["next_visit_recommendation"]["suggested_date"] != "2026-09-01"

    second = await client.post("/api/v1/visits", json=payload, headers=chw)
    assert second.status_code == 200
    assert second.json()["created"] is False
    assert second.json()["visit_id"] == visit_id
    assert fake_db.count(Visit) == 1

    conflict = await client.post(
        "/api/v1/visits",
        json={**payload, "household_id": str(uuid.uuid4())},
        headers=chw,
    )
    assert conflict.status_code == 409


@pytest.mark.asyncio
async def test_chw_cannot_spoof_another_chw_id(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    response = await client.post(
        "/api/v1/visits",
        json={
            "household_id": str(uuid.uuid4()),
            "chw_id": "attacker-chw",
            "visit_date": "2026-08-20T08:00:00Z",
            "visit_type": "routine",
        },
        headers=chw,
    )
    assert response.status_code == 201
    assert fake_db.rows(Visit)[0].chw_id == CHW_ID


@pytest.mark.asyncio
async def test_priority_list_comes_from_database(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    household, pregnancy, child = _seed_catchment(fake_db)

    empty = await client.get(f"/api/v1/chw/{CHW_ID}/priority-list", headers=chw)
    assert empty.status_code == 200
    visits = empty.json()["visits"]
    assert len(visits) == 2
    assert visits[0]["household_name"] == "Grace Phiri"
    assert visits[0]["overdue_days"] == 3
    assert visits[0]["risk_category"] == "high"
    assert visits[1]["household_id"] == child.household_id

    forbidden = await client.get("/api/v1/chw/other-chw/priority-list", headers=chw)
    assert forbidden.status_code == 403

    supervisor = auth_headers("supervisor")
    allowed = await client.get(f"/api/v1/chw/{CHW_ID}/priority-list", headers=supervisor)
    assert allowed.status_code == 200
    assert len(allowed.json()["visits"]) == 2
    assert household.household_id in {v["household_id"] for v in allowed.json()["visits"]}
    assert pregnancy.woman_name == "Grace Phiri"


@pytest.mark.asyncio
async def test_referral_sync_is_idempotent(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    referral_id = str(uuid.uuid4())
    payload = {
        "referral_id": referral_id,
        "visit_id": str(uuid.uuid4()),
        "patient_id": str(uuid.uuid4()),
        "referral_reason": "severe_bp",
        "urgency": "emergency",
        "selected_facility_id": str(uuid.uuid4()),
    }
    first = await client.post("/api/v1/referrals", json=payload, headers=chw)
    assert first.status_code == 201
    code = first.json()["referral_code"]

    second = await client.post("/api/v1/referrals", json=payload, headers=chw)
    assert second.status_code == 200
    assert second.json()["referral_id"] == referral_id
    assert second.json()["referral_code"] == code
    assert fake_db.count(Referral) == 1


@pytest.mark.asyncio
async def test_override_requires_reason(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    missing = await client.post(
        "/api/v1/visits",
        json={
            "household_id": str(uuid.uuid4()),
            "visit_date": "2026-08-20T08:00:00Z",
            "visit_type": "pregnancy",
            "chw_override": True,
        },
        headers=chw,
    )
    assert missing.status_code == 422

    ok = await client.post(
        "/api/v1/visits",
        json={
            "household_id": str(uuid.uuid4()),
            "visit_date": "2026-08-20T08:00:00Z",
            "visit_type": "pregnancy",
            "chw_override": True,
            "chw_override_reason": "Patient already referred yesterday",
            "ai_recommendation": {"risk_score": 8.1, "risk_category": "high", "action": "immediate_referral"},
            "chw_notes": "Esnat Phiri declined transport",
        },
        headers=chw,
    )
    assert ok.status_code == 201
    stored = fake_db.rows(Visit)[-1]
    assert stored.chw_override is True
    assert stored.ai_recommendation["model_version"] == "rule-based-v1"

    listing = await client.get(f"/api/v1/chw/{CHW_ID}/overrides", headers=chw)
    assert listing.status_code == 200
    assert listing.json()["overrides"][0]["chw_notes"] == "Esnat Phiri declined transport"

    supervisor = auth_headers("supervisor")
    supervised = await client.get(f"/api/v1/chw/{CHW_ID}/overrides", headers=supervisor)
    assert supervised.status_code == 200
    assert "chw_notes" not in supervised.json()["overrides"][0]


@pytest.mark.asyncio
async def test_visit_gps_is_coarsened(client, fake_db, auth_headers):
    chw = auth_headers("chw", user_id=CHW_ID)
    response = await client.post(
        "/api/v1/visits",
        json={
            "household_id": str(uuid.uuid4()),
            "visit_date": "2026-08-20T08:00:00Z",
            "visit_type": "routine",
            "gps_lat": -16.53281,
            "gps_lon": 35.14199,
        },
        headers=chw,
    )
    assert response.status_code == 201
    stored = fake_db.rows(Visit)[-1]
    assert stored.gps_lat == -16.53
    assert stored.gps_lon == 35.14
