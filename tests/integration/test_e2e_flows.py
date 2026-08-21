"""End-to-end flow tests for the Zisamale platform.

Each test walks a complete business flow through the real FastAPI application
(in-memory database, real JWT auth, real middleware stack):

household -> pregnancy registration -> visit -> risk score -> referral
-> facility notification, plus surveillance ingestion, alert lifecycle and
multi-role access checks.
"""

from __future__ import annotations

import uuid
from datetime import datetime

import pytest

from app.models.alert import Alert
from app.models.child import Child
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.referral import Referral
from app.models.visit import Visit

DISTRICT_ID = "11111111-1111-1111-1111-111111111111"
FACILITY_ID = "22222222-2222-2222-2222-222222222222"
CHW_ID = "chw-001"


def _seed_household_and_pregnancy(db) -> tuple[Household, Pregnancy]:
    household = Household(
        household_id=str(uuid.uuid4()),
        chw_id=CHW_ID,
        village_name="Chikwawa",
        ta_name="T/A Mlolo",
        food_security_score=2,
        distance_to_facility_km=14.0,
        household_size=6,
        sync_status="synced",
    )
    pregnancy = Pregnancy(
        pregnancy_id=str(uuid.uuid4()),
        household_id=household.household_id,
        woman_name="Esnat Phiri",
        age=17,
        parity=0,
        gravida=1,
        prior_stillbirths=1,
        bp_systolic=150,
        bp_diastolic=95,
        hemoglobin=7.8,
        risk_category="low",
        is_active=True,
    )
    db.seed(household, pregnancy)
    return household, pregnancy


@pytest.mark.asyncio
async def test_visit_flow(client, fake_db, auth_headers):
    """household -> pregnancy -> visit -> risk score -> referral -> facility."""
    chw = auth_headers("chw")
    household, pregnancy = _seed_household_and_pregnancy(fake_db)

    # 1. Risk score computed server-side from the pregnancy's vitals.
    risk_response = await client.post(
        "/api/v1/ml/predict/pregnancy-risk",
        json={
            "age": 17,
            "parity": 0,
            "prior_stillbirths": 1,
            "bp_systolic": 150,
            "bp_diastolic": 95,
            "hemoglobin": 7.8,
            "food_security_score": 2,
            "distance_to_facility_km": 14.0,
        },
        headers=chw,
    )
    assert risk_response.status_code == 200
    risk = risk_response.json()
    assert risk["risk_score"] >= 8.0
    assert risk["risk_category"] in ("high", "critical")
    assert any("stillbirth" in f.lower() for f in risk["top_factors"])

    # 2. CHW submits the visit record with danger signs and the AI advice.
    visit_response = await client.post(
        "/api/v1/visits",
        json={
            "household_id": household.household_id,
            "chw_id": CHW_ID,
            "visit_date": "2026-08-20T09:30:00Z",
            "pregnancy_id": pregnancy.pregnancy_id,
            "visit_type": "pregnancy",
            "symptoms": ["headache", "blurred_vision"],
            "danger_signs": ["severe_bp", "oedema"],
            "measurements": {"bp_systolic": 150, "bp_diastolic": 95, "hemoglobin": 7.8},
            "ai_recommendation": {
                "risk_score": risk["risk_score"],
                "risk_category": risk["risk_category"],
                "action": "immediate_referral",
            },
            "gps_lat": -16.53,
            "gps_lon": 34.78,
            "photos": ["photo-1.jpg"],
        },
        headers=chw,
    )
    assert visit_response.status_code == 201
    visit_body = visit_response.json()
    assert visit_body["sync_status"] == "synced"
    assert visit_body["next_visit_recommendation"]["visit_type"] == "followup"

    stored_visit = fake_db.rows(Visit)[0]
    assert stored_visit.pregnancy_id == pregnancy.pregnancy_id
    assert stored_visit.photos_queued == 1

    # 3. Visit triggers an emergency referral to the nearest equipped facility.
    referral_response = await client.post(
        "/api/v1/referrals",
        json={
            "visit_id": visit_body["visit_id"],
            "patient_id": pregnancy.pregnancy_id,
            "referral_reason": "Severe pre-eclampsia indicators",
            "urgency": "emergency",
            "recommended_facilities": [
                {
                    "facility_id": FACILITY_ID,
                    "facility_name": "Nsanje District Hospital",
                    "distance_km": 14.0,
                    "stock_status": {"blood_units": 4, "magnesium_sulfate": True},
                    "score": 0.91,
                }
            ],
            "selected_facility_id": FACILITY_ID,
            "chw_id": CHW_ID,
        },
        headers=chw,
    )
    assert referral_response.status_code == 201
    referral = referral_response.json()
    assert len(referral["referral_code"]) == 8
    assert referral["facility_notification_status"] == "queued"

    # 4. Facility notification was queued against the persisted referral.
    stored_referral = fake_db.rows(Referral)[0]
    assert stored_referral.selected_facility_id == FACILITY_ID
    assert stored_referral.facility_notified is False  # queued for dispatch
    assert stored_referral.status == "pending"
    assert stored_referral.urgency == "emergency"

    # 5. The full trail is auditable.
    from app.models.audit import AuditLog

    visit_audit_entries = [
        entry
        for entry in fake_db.rows(AuditLog)
        if entry.action == "POST /api/v1/visits"
    ]
    assert visit_audit_entries, "visit creation should be captured in the audit log"


@pytest.mark.asyncio
async def test_surveillance_flow(client, fake_db, auth_headers):
    """DHIS2 ingestion -> alert generation -> dashboard display."""
    dho = auth_headers("dho", user_id="dho-user-1")

    ingest = await client.post(
        "/api/v1/integrations/dhis2/ingest",
        json={
            "district_id": DISTRICT_ID,
            "rows": [
                ["malaria_cases", DISTRICT_ID, "2026W32", "180"],
                ["malaria_cases", DISTRICT_ID, "2026W33", "410"],
            ],
        },
        headers=dho,
    )
    assert ingest.status_code == 200
    assert ingest.json()["alerts_created"] == 1

    alerts_response = await client.get(
        f"/api/v1/district/{DISTRICT_ID}/alerts", headers=dho
    )
    assert alerts_response.status_code == 200
    payload = alerts_response.json()
    assert len(payload["alerts"]) == 1
    displayed = payload["alerts"][0]
    assert displayed["disease"] == "malaria"
    assert displayed["alert_level"] == "red"
    assert displayed["predicted_cases"] >= 400
    assert displayed["response_status"] == "pending"

    trends_response = await client.get(
        f"/api/v1/district/{DISTRICT_ID}/surveillance/trends", headers=dho
    )
    assert trends_response.status_code == 200
    trends = trends_response.json()
    assert trends["source"] == "dhis2"
    assert len(trends["actual_cases"]) == 2
    assert trends["model_accuracy"] is None


@pytest.mark.asyncio
async def test_alert_lifecycle(client, fake_db, auth_headers):
    """Create -> acknowledge -> investigate -> resolve."""
    dho = auth_headers("dho", user_id="dho-user-1")
    alert = Alert(
        alert_id=str(uuid.uuid4()),
        disease="cholera",
        district_id=DISTRICT_ID,
        ta_name="T/A Nyachikadza",
        risk_score=7.9,
        alert_level="high",
        predicted_cases=65,
        confidence_interval_lower=40,
        confidence_interval_upper=95,
        recommended_actions=["Preposition ORS", "Water treatment campaign"],
        generated_at=datetime(2026, 8, 19, 8, 0, 0),
        status="pending",
    )
    fake_db.seed(alert)

    async def respond(status: str, actions: list[str], notes: str):
        return await client.post(
            f"/api/v1/alerts/{alert.alert_id}/respond",
            json={
                "response_status": status,
                "responded_by": "dho-user-1",
                "actions_taken": actions,
                "resources_deployed": {"teams": 2},
                "notes": notes,
            },
            headers=dho,
        )

    # Acknowledge
    ack = await respond("acknowledged", ["Alert reviewed by DHO"], "Assigning surveillance team")
    assert ack.status_code == 200
    assert ack.json() == {"status": "updated", "alert_id": alert.alert_id}
    assert fake_db.rows(Alert)[0].status == "acknowledged"

    # Investigate
    investigate = await respond(
        "in_progress",
        ["Field investigation started", "Community health workers sensitised"],
        "12 suspected cases under follow-up",
    )
    assert investigate.status_code == 200
    stored = fake_db.rows(Alert)[0]
    assert stored.status == "in_progress"
    assert stored.responded_by == "dho-user-1"
    assert stored.responded_at is not None

    # Resolve
    resolve = await respond(
        "resolved",
        ["ORS distributed", "Borehole chlorinated"],
        "No new cases for 7 consecutive days",
    )
    assert resolve.status_code == 200
    assert fake_db.rows(Alert)[0].status == "resolved"

    # Resolved alerts no longer appear on the active dashboard.
    listing = await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=dho)
    assert listing.status_code == 200
    assert listing.json()["alerts"] == []


@pytest.mark.asyncio
async def test_multi_user_roles(client, fake_db, auth_headers):
    """CHWs, DHOs and MoHP users each see the data appropriate to their role."""
    alert = Alert(
        alert_id=str(uuid.uuid4()),
        disease="malaria",
        district_id=DISTRICT_ID,
        ta_name="T/A Mlolo",
        risk_score=6.4,
        alert_level="medium",
        predicted_cases=120,
        confidence_interval_lower=90,
        confidence_interval_upper=160,
        recommended_actions=["Restock ACTs"],
        generated_at=datetime(2026, 8, 18, 10, 0, 0),
        status="pending",
    )
    fake_db.seed(alert)

    chw = auth_headers("chw", user_id=CHW_ID)
    dho = auth_headers("dho")
    mohp = auth_headers("mohp")

    household = Household(
        household_id=str(uuid.uuid4()),
        chw_id=CHW_ID,
        village_name="Chikwawa",
        distance_to_facility_km=12.0,
        sync_status="synced",
    )
    pregnancy = Pregnancy(
        pregnancy_id=str(uuid.uuid4()),
        household_id=household.household_id,
        woman_name="Esnat Phiri",
        risk_score=8.5,
        risk_category="high",
        is_active=True,
        top_risk_factors=["High BP"],
    )
    child = Child(
        child_id=str(uuid.uuid4()),
        household_id=household.household_id,
        child_name="Chisomo Banda",
        risk_score=4.2,
        risk_category="medium",
        top_risk_factors=["Low MUAC"],
    )
    fake_db.seed(household, pregnancy, child)

    # CHW: field-level access only.
    assert (
        await client.get("/api/v1/national/overview", headers=chw)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=chw)
    ).status_code == 403
    priority = await client.get(f"/api/v1/chw/{CHW_ID}/priority-list", headers=chw)
    assert priority.status_code == 200
    assert {v["risk_category"] for v in priority.json()["visits"]} == {"high", "medium"}
    other = await client.get("/api/v1/chw/someone-else/priority-list", headers=chw)
    assert other.status_code == 403

    # DHO: district-level surveillance, but not national strategy.
    district = await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=dho)
    assert district.status_code == 200
    assert len(district.json()["alerts"]) == 1
    assert (
        await client.get("/api/v1/national/overview", headers=dho)
    ).status_code == 403

    # MoHP: full national visibility.
    overview = await client.get("/api/v1/national/overview", headers=mohp)
    assert overview.status_code == 200
    districts = overview.json()["districts"]
    assert {d["district_name"] for d in districts} == {"Nsanje", "Neno", "Blantyre"}
    forecast = await client.get("/api/v1/national/forecast?scenario=increased_budget", headers=mohp)
    assert forecast.status_code == 200
    assert forecast.json()["budget_scenario"]["scenario_name"] == "increased_budget"

    # Anonymous requests are rejected everywhere.
    assert (await client.get("/api/v1/national/overview")).status_code == 401
