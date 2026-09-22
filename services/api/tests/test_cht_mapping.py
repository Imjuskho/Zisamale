from app.integrations.cht_mapping import (
    field_map_catalog,
    map_cht_document,
    visit_to_cht_report,
)
from app.integrations.dhis2 import parse_analytics_payload
from app.integrations.ingest import classify_disease, parse_epi_week


def test_skips_unknown_cht_forms():
    assert map_cht_document({"_id": "x", "type": "data_record", "form": "stock_count"}) is None
    assert map_cht_document({"_id": "p", "type": "person"}) is None


def test_maps_household_contact_without_person_name():
    mapped = map_cht_document(
        {
            "_id": "hh-1",
            "type": "contact",
            "contact_type": "clinic",
            "name": "Phiri Family",
            "parent": {"_id": "chw-9"},
            "geolocation": {"latitude": -16.53281, "longitude": 35.14199},
        }
    )
    assert mapped["kind"] == "household"
    assert mapped["household_id"] == "hh-1"
    assert mapped["chw_id"] == "chw-9"
    assert mapped["village_name"] is None
    assert mapped["gps_lat"] == -16.53281


def test_maps_pregnancy_register_and_danger_signs():
    mapped = map_cht_document(
        {
            "_id": "preg-1",
            "type": "data_record",
            "form": "pregnancy",
            "contact": {"_id": "chw-9", "parent": {"_id": "hh-1"}},
            "fields": {
                "patient_uuid": "woman-1",
                "place_id": "hh-1",
                "lmp_date": "2026-01-15",
                "age": "17",
                "parity": 0,
                "bp_systolic": 150,
                "fever": "yes",
                "vaginal_bleeding": True,
            },
        }
    )
    assert mapped["kind"] == "pregnancy"
    assert mapped["household_id"] == "hh-1"
    assert mapped["age"] == 17
    assert "fever" in mapped["danger_signs"]
    assert "vaginal_bleeding" in mapped["danger_signs"]
    assert "woman_name" not in mapped


def test_maps_child_assessment_to_visit():
    mapped = map_cht_document(
        {
            "_id": "rpt-22",
            "type": "data_record",
            "form": "assessment",
            "reported_date": 1750000000000,
            "contact": {"_id": "chw-9"},
            "fields": {"patient_uuid": "child-1", "place_id": "hh-1", "muac": "11.0"},
        }
    )
    assert mapped["kind"] == "visit"
    assert mapped["visit_type"] == "child"
    assert mapped["muac"] == 11.0


def test_outbound_visit_is_a_cht_report_not_a_register():
    report = visit_to_cht_report(
        {
            "visit_id": "v1",
            "household_id": "hh-1",
            "visit_type": "pregnancy",
            "danger_signs": ["fever"],
            "chw_override": True,
            "chw_override_reason": "Already referred",
            "ai_recommendation": {
                "risk_score": 8.2,
                "risk_category": "high",
                "model_version": "rule-based-v1",
            },
        }
    )
    assert report["type"] == "data_record"
    assert report["form"] == "pregnancy_home_visit"
    assert report["fields"]["place_id"] == "hh-1"
    assert report["fields"]["chw_override"] is True


def test_field_map_catalog_is_explicit():
    catalog = field_map_catalog()
    assert catalog["system_of_record"].startswith("iCHIS")
    assert "pregnancy" in catalog["pregnancy_register_forms"]


def test_parse_analytics_list_and_json():
    cells = parse_analytics_payload([["malaria_confirmed", "ou1", "2026W33", "410"]])
    assert cells[0]["value"] == "410"
    payload = {
        "headers": [{"name": "dx"}, {"name": "ou"}, {"name": "pe"}, {"name": "value"}],
        "rows": [["abcUID", "ou1", "2026W32", "12"]],
    }
    parsed = parse_analytics_payload(payload)
    assert parsed[0]["data_element"] == "abcUID"
    assert parsed[0]["period"] == "2026W32"


def test_epi_week_and_disease():
    week, year, number = parse_epi_week("2026-W3")
    assert (week, year, number) == ("2026W03", 2026, 3)
    assert classify_disease("malaria_confirmed") == "malaria"
    assert classify_disease("MALARIA_CASES") == "malaria"
