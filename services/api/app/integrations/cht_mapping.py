"""Map Community Health Toolkit / iCHIS Couch documents onto Zisamale records.

CHT persists contacts and reports in CouchDB (Malawi iCHIS is CHT-based):

- Places/people: ``type=contact`` (or legacy ``clinic`` / ``person``)
- Reports: ``type=data_record`` with the xform id in ``form`` and answers in ``fields``

This module is the contract that keeps Zisamale from growing a parallel register.
Unknown form ids are ignored, not invented.
"""

from __future__ import annotations

from typing import Any

# CHT form ids used in Medic core configs and common iCHIS customisations.
PREGNANCY_REGISTER_FORMS = frozenset({"pregnancy", "p", "pregnancy_registration"})
PREGNANCY_VISIT_FORMS = frozenset(
    {"pregnancy_home_visit", "pregnancy_danger_sign", "anc", "anc_visit", "pnc_danger_sign"}
)
CHILD_VISIT_FORMS = frozenset(
    {"assessment", "under_five_assessment", "iccm", "child_assessment", "u5", "imm"}
)
HOUSEHOLD_CONTACT_TYPES = frozenset(
    {"clinic", "household", "family", "chw_area", "area", "community"}
)

# Boolean / coded danger-sign keys that appear on Medic pregnancy configs.
DANGER_SIGN_FIELDS = (
    "vaginal_bleeding",
    "fits",
    "convulsions",
    "severe_headache",
    "headache",
    "blurred_vision",
    "fever",
    "severe_abdominal_pain",
    "abdominal_pain",
    "reduced_fetal_movement",
    "reduced_fetal_movements",
    "oedema",
    "difficulty_breathing",
    "unable_to_drink",
    "vomiting_everything",
    "chest_indrawing",
    "lethargy",
)

FIELD_MAP = {
    "household_id": ["place_id", "patient_id", "household_id"],
    "patient_uuid": ["patient_uuid", "patient_id"],
    "lmp_date": ["lmp_date", "lmp", "last_menstrual_period"],
    "edd_date": ["edd_date", "edd", "expected_date"],
    "parity": ["parity", "gravida_parity"],
    "gravida": ["gravida"],
    "bp_systolic": ["bp_systolic", "blood_pressure_systolic", "sys_bp"],
    "bp_diastolic": ["bp_diastolic", "blood_pressure_diastolic", "dia_bp"],
    "hemoglobin": ["hemoglobin", "hb", "haemoglobin"],
    "muac": ["muac", "muac_cm"],
    "weight_kg": ["weight_kg", "weight"],
    "age": ["age", "age_years"],
}


def field_map_catalog() -> dict:
    """Operator-facing view of which CHT fields we honour."""
    return {
        "system_of_record": "iCHIS / Community Health Toolkit (CouchDB)",
        "pregnancy_register_forms": sorted(PREGNANCY_REGISTER_FORMS),
        "pregnancy_visit_forms": sorted(PREGNANCY_VISIT_FORMS),
        "child_visit_forms": sorted(CHILD_VISIT_FORMS),
        "household_contact_types": sorted(HOUSEHOLD_CONTACT_TYPES),
        "fields": FIELD_MAP,
        "danger_sign_fields": list(DANGER_SIGN_FIELDS),
        "notes": (
            "Person names and phone numbers are not mapped into cloud tables. "
            "Household GPS is coarsened at persist time. Form ids not listed here "
            "are skipped so we do not invent a parallel register."
        ),
    }


def _fields(doc: dict[str, Any]) -> dict[str, Any]:
    raw = doc.get("fields") or {}
    return raw if isinstance(raw, dict) else {}


def _pick(fields: dict[str, Any], logical: str) -> Any:
    for key in FIELD_MAP.get(logical, ()):
        if key in fields and fields[key] not in (None, ""):
            return fields[key]
    return None


def _truthy(value: Any) -> bool:
    if value is True or value == 1:
        return True
    if isinstance(value, str) and value.strip().lower() in {"yes", "true", "1", "ok"}:
        return True
    return False


def _danger_signs(fields: dict[str, Any]) -> list[str]:
    signs: list[str] = []
    bundled = fields.get("danger_signs") or fields.get("group_danger_signs")
    if isinstance(bundled, list):
        signs.extend(str(item) for item in bundled if item)
    elif isinstance(bundled, str) and bundled:
        signs.extend(part.strip() for part in bundled.replace(";", ",").split(",") if part.strip())
    for key in DANGER_SIGN_FIELDS:
        if _truthy(fields.get(key)):
            signs.append(key)
    # de-dupe, stable
    seen: set[str] = set()
    ordered: list[str] = []
    for sign in signs:
        if sign not in seen:
            seen.add(sign)
            ordered.append(sign)
    return ordered


def _chw_id(doc: dict[str, Any]) -> str | None:
    contact = doc.get("contact")
    if isinstance(contact, dict):
        return contact.get("_id") or contact.get("uuid")
    return doc.get("reported_by") or doc.get("from")


def _geopoint(doc: dict[str, Any], fields: dict[str, Any]) -> tuple[float | None, float | None]:
    geo = doc.get("geolocation") or fields.get("geolocation") or {}
    if isinstance(geo, str) and " " in geo:
        parts = geo.split()
        try:
            return float(parts[0]), float(parts[1])
        except (TypeError, ValueError):
            return None, None
    if isinstance(geo, dict):
        lat = geo.get("latitude") or geo.get("lat")
        lon = geo.get("longitude") or geo.get("lon") or geo.get("lng")
        try:
            return (float(lat) if lat is not None else None, float(lon) if lon is not None else None)
        except (TypeError, ValueError):
            return None, None
    return None, None


def _is_household_contact(doc: dict[str, Any]) -> bool:
    if doc.get("type") in {"clinic"}:
        return True
    if doc.get("type") == "contact" and doc.get("contact_type") in HOUSEHOLD_CONTACT_TYPES:
        return True
    return False


def map_cht_document(doc: dict[str, Any]) -> dict[str, Any] | None:
    """Return a typed mapping or None if the document is out of scope."""
    if not isinstance(doc, dict) or not doc.get("_id"):
        return None

    if _is_household_contact(doc):
        lat, lon = _geopoint(doc, _fields(doc))
        parent = doc.get("parent") if isinstance(doc.get("parent"), dict) else {}
        return {
            "kind": "household",
            "household_id": doc["_id"],
            "chw_id": parent.get("_id") or _chw_id(doc),
            "village_name": None,
            "ta_name": None,
            "gps_lat": lat,
            "gps_lon": lon,
            "source": "cht",
        }

    if doc.get("type") != "data_record":
        return None

    form = str(doc.get("form") or "").strip().lower()
    fields = _fields(doc)
    patient = _pick(fields, "patient_uuid")
    place = _pick(fields, "household_id") or (
        doc.get("contact", {}).get("parent", {}).get("_id")
        if isinstance(doc.get("contact"), dict) and isinstance(doc.get("contact", {}).get("parent"), dict)
        else None
    )
    chw_id = _chw_id(doc)
    reported = doc.get("reported_date") or doc.get("received_time")

    if form in PREGNANCY_REGISTER_FORMS:
        return {
            "kind": "pregnancy",
            "pregnancy_id": doc["_id"],
            "household_id": place,
            "patient_uuid": patient,
            "lmp_date": _pick(fields, "lmp_date"),
            "edd_date": _pick(fields, "edd_date"),
            "parity": _as_int(_pick(fields, "parity")),
            "gravida": _as_int(_pick(fields, "gravida")) or 1,
            "age": _as_int(_pick(fields, "age")),
            "bp_systolic": _as_int(_pick(fields, "bp_systolic")),
            "bp_diastolic": _as_int(_pick(fields, "bp_diastolic")),
            "hemoglobin": _as_float(_pick(fields, "hemoglobin")),
            "danger_signs": _danger_signs(fields),
            "chw_id": chw_id,
            "source": "cht",
            "form": form,
        }

    if form in PREGNANCY_VISIT_FORMS or form in CHILD_VISIT_FORMS:
        visit_type = "child" if form in CHILD_VISIT_FORMS else "pregnancy"
        return {
            "kind": "visit",
            "visit_id": doc["_id"],
            "household_id": place or "unknown",
            "pregnancy_id": doc["_id"] if visit_type == "pregnancy" and form in PREGNANCY_REGISTER_FORMS else None,
            "child_id": patient if visit_type == "child" else None,
            "patient_uuid": patient,
            "chw_id": chw_id,
            "visit_type": visit_type,
            "visit_date": str(reported) if reported else None,
            "danger_signs": _danger_signs(fields),
            "bp_systolic": _as_int(_pick(fields, "bp_systolic")),
            "bp_diastolic": _as_int(_pick(fields, "bp_diastolic")),
            "muac": _as_float(_pick(fields, "muac")),
            "weight_kg": _as_float(_pick(fields, "weight_kg")),
            "source": "cht",
            "form": form,
        }

    return None


def visit_to_cht_report(visit: dict[str, Any]) -> dict[str, Any]:
    """Outbound CHT data_record so we push advice, not a second household form."""
    visit_type = visit.get("visit_type") or "routine"
    form = "pregnancy_home_visit" if visit_type == "pregnancy" else (
        "assessment" if visit_type == "child" else "zisamale_visit"
    )
    recommendation = visit.get("ai_recommendation") or {}
    return {
        "_id": visit.get("visit_id"),
        "type": "data_record",
        "form": form,
        "fields": {
            "place_id": visit.get("household_id"),
            "patient_uuid": visit.get("child_id") or visit.get("pregnancy_id"),
            "danger_signs": visit.get("danger_signs") or [],
            "chw_override": visit.get("chw_override"),
            "chw_override_reason": visit.get("chw_override_reason"),
            "ai_risk_score": visit.get("ai_risk_score") or recommendation.get("risk_score"),
            "ai_risk_category": recommendation.get("risk_category"),
            "ai_top_factors": recommendation.get("top_factors") or [],
            "ai_model_version": recommendation.get("model_version"),
        },
    }


def _as_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
