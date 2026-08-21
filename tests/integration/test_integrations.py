"""CHT document ingest and DHIS2 weekly pull persist into the warehouse."""

from __future__ import annotations

import pytest

from app.models.alert import Alert
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.surveillance import SurveillanceWeekly
from app.models.visit import Visit

DISTRICT_ID = "11111111-1111-1111-1111-111111111111"


@pytest.mark.asyncio
async def test_cht_field_map_requires_staff(client, auth_headers):
    assert (await client.get("/api/v1/integrations/cht/field-map")).status_code == 401
    denied = await client.get(
        "/api/v1/integrations/cht/field-map", headers=auth_headers("chw")
    )
    assert denied.status_code == 403
    ok = await client.get(
        "/api/v1/integrations/cht/field-map", headers=auth_headers("phim")
    )
    assert ok.status_code == 200
    assert ok.json()["pregnancy_register_forms"]


@pytest.mark.asyncio
async def test_cht_ingest_maps_documents(client, fake_db, auth_headers):
    phim = auth_headers("phim")
    body = {
        "documents": [
            {
                "_id": "hh-cht-1",
                "type": "contact",
                "contact_type": "household",
                "name": "Should Not Persist",
                "parent": {"_id": "chw-cht"},
                "geolocation": {"latitude": -16.53281, "longitude": 35.14199},
            },
            {
                "_id": "preg-cht-1",
                "type": "data_record",
                "form": "pregnancy",
                "contact": {"_id": "chw-cht"},
                "fields": {
                    "place_id": "hh-cht-1",
                    "patient_uuid": "woman-uuid",
                    "lmp_date": "2026-02-01",
                    "age": 22,
                },
            },
            {
                "_id": "visit-cht-1",
                "type": "data_record",
                "form": "pregnancy_home_visit",
                "reported_date": "2026-08-20T09:00:00Z",
                "contact": {"_id": "chw-cht"},
                "fields": {"place_id": "hh-cht-1", "fever": "yes"},
            },
            {
                "_id": "ignored",
                "type": "data_record",
                "form": "stock_count",
            },
        ]
    }
    response = await client.post("/api/v1/integrations/cht/ingest", json=body, headers=phim)
    assert response.status_code == 200
    counts = response.json()
    assert counts["households"] == 1
    assert counts["pregnancies"] == 1
    assert counts["visits"] == 1
    assert counts["skipped"] == 1

    household = fake_db.rows(Household)[0]
    assert household.household_id == "hh-cht-1"
    assert household.village_name is None
    assert household.gps_lat == -16.53
    pregnancy = fake_db.rows(Pregnancy)[0]
    assert pregnancy.woman_name is None
    assert pregnancy.lmp_date == "2026-02-01"
    visit = fake_db.rows(Visit)[0]
    assert visit.visit_id == "visit-cht-1"
    assert "fever" in (visit.danger_signs or [])

    again = await client.post("/api/v1/integrations/cht/ingest", json=body, headers=phim)
    assert again.json()["visits"] == 1
    assert fake_db.count(Visit) == 1


@pytest.mark.asyncio
async def test_dhis2_weekly_ingest_writes_surveillance_and_alerts(
    client, fake_db, auth_headers
):
    dho = auth_headers("dho")
    payload = {
        "district_id": DISTRICT_ID,
        "generate_alerts": True,
        "rows": [
            ["malaria_confirmed", DISTRICT_ID, "2026W32", "180"],
            ["malaria_confirmed", DISTRICT_ID, "2026W33", "410"],
        ],
    }
    response = await client.post(
        "/api/v1/integrations/dhis2/ingest", json=payload, headers=dho
    )
    assert response.status_code == 200
    body = response.json()
    assert body["weeks_upserted"] == 2
    assert body["alerts_created"] == 1

    weeks = {row.epidemiological_week: row.confirmed_cases for row in fake_db.rows(SurveillanceWeekly)}
    assert weeks["2026W32"] == 180
    assert weeks["2026W33"] == 410

    alerts = fake_db.rows(Alert)
    assert len(alerts) == 1
    assert alerts[0].disease == "malaria"
    assert alerts[0].alert_level == "red"
    assert alerts[0].model_version == "threshold-v1"

    trends = await client.get(
        f"/api/v1/district/{DISTRICT_ID}/surveillance/trends", headers=dho
    )
    assert trends.status_code == 200
    chart = trends.json()
    assert chart["source"] == "dhis2"
    assert chart["model_accuracy"] is None
    assert {point["week"]: point["cases"] for point in chart["actual_cases"]}["2026W33"] == 410

    listing = await client.get(f"/api/v1/district/{DISTRICT_ID}/alerts", headers=dho)
    assert listing.json()["alerts"][0]["alert_level"] == "red"

    repeat = await client.post(
        "/api/v1/integrations/dhis2/ingest", json=payload, headers=dho
    )
    assert repeat.json()["alerts_created"] == 0
    assert fake_db.count(Alert) == 1
    assert fake_db.count(SurveillanceWeekly) == 2
