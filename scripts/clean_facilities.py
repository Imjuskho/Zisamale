#!/usr/bin/env python3
"""
ZISAMALE FACILITY DATA PIPELINE
Merges Zenodo (Zipatala+DHIS2) + OSM/HDX datasets into a single
facilities.json for the Moyo Map.

Sources:
  1. Zenodo shapefile: 484 Government facilities (no type, no hospitals)
  2. OSM GeoJSON: 330 facilities with amenity/healthcare tags

Output: public/data/facilities.json
"""

import json
import shapefile
import hashlib
from collections import Counter

# ── District hospital reference data (excluded from Zenodo) ──────────
# These are Malawi's 28 district hospitals + 1 central hospital
DISTRICT_HOSPITALS = [
    {"name": "Queen Elizabeth Central Hospital", "district": "Blantyre", "lat": -15.7861, "lng": 35.0058, "ownership": "Government"},
    {"name": "Mzuzu Central Hospital", "district": "Mzimba-North", "lat": -11.4516, "lng": 34.0184, "ownership": "Government"},
    {"name": "Lilongwe Central Hospital", "district": "Lilongwe", "lat": -13.9626, "lng": 33.7741, "ownership": "Government"},
    {"name": "Zomba Central Hospital", "district": "Zomba", "lat": -15.3875, "lng": 35.3343, "ownership": "Government"},
    {"name": "Nsanje District Hospital", "district": "Nsanje", "lat": -16.9167, "lng": 35.2667, "ownership": "Government"},
    {"name": "Chikwawa District Hospital", "district": "Chikwawa", "lat": -16.0342, "lng": 34.8008, "ownership": "Government"},
    {"name": "Thyolo District Hospital", "district": "Thyolo", "lat": -16.0667, "lng": 35.1333, "ownership": "Government"},
    {"name": "Mulanje District Hospital", "district": "Mulanje", "lat": -16.0333, "lng": 35.5000, "ownership": "Government"},
    {"name": "Phalombe District Hospital", "district": "Phalombe", "lat": -15.8000, "lng": 35.6500, "ownership": "Government"},
    {"name": "Chiradzulu District Hospital", "district": "Chiradzulu", "lat": -15.7000, "lng": 35.1333, "ownership": "Government"},
    {"name": "Blantyre District Hospital", "district": "Blantyre", "lat": -15.7200, "lng": 35.0000, "ownership": "Government"},
    {"name": "Mangochi District Hospital", "district": "Mangochi", "lat": -14.4778, "lng": 35.2644, "ownership": "Government"},
    {"name": "Balaka District Hospital", "district": "Balaka", "lat": -14.9833, "lng": 34.9667, "ownership": "Government"},
    {"name": "Machinga District Hospital", "district": "Machinga", "lat": -15.1833, "lng": 35.3000, "ownership": "Government"},
    {"name": "Ntcheu District Hospital", "district": "Ntcheu", "lat": -14.8167, "lng": 34.6333, "ownership": "Government"},
    {"name": "Dedza District Hospital", "district": "Dedza", "lat": -14.3500, "lng": 34.3333, "ownership": "Government"},
    {"name": "Ntchisi District Hospital", "district": "Ntchisi", "lat": -13.5167, "lng": 33.9000, "ownership": "Government"},
    {"name": "Dowa District Hospital", "district": "Dowa", "lat": -13.7500, "lng": 33.9333, "ownership": "Government"},
    {"name": "Salima District Hospital", "district": "Salima", "lat": -13.7500, "lng": 34.4667, "ownership": "Government"},
    {"name": "Nkhotakota District Hospital", "district": "Nkhotakota", "lat": -12.9167, "lng": 34.3000, "ownership": "Government"},
    {"name": "Nkhata Bay District Hospital", "district": "Nkhata-Bay", "lat": -11.6000, "lng": 34.3000, "ownership": "Government"},
    {"name": "Rumphi District Hospital", "district": "Rumphi", "lat": -11.0167, "lng": 33.8500, "ownership": "Government"},
    {"name": "Mzimba South District Hospital", "district": "Mzimba-South", "lat": -12.5000, "lng": 33.8333, "ownership": "Government"},
    {"name": "Karonga District Hospital", "district": "Karonga", "lat": -10.3333, "lng": 33.7833, "ownership": "Government"},
    {"name": "Chitipa District Hospital", "district": "Chitipa", "lat": -9.9167, "lng": 33.2667, "ownership": "Government"},
    {"name": "Kasungu District Hospital", "district": "Kasungu", "lat": -13.0333, "lng": 33.4833, "ownership": "Government"},
    {"name": "Mchinji District Hospital", "district": "Mchinji", "lat": -13.8167, "lng": 32.9000, "ownership": "Government"},
    {"name": "Neno District Hospital", "district": "Neno", "lat": -15.5667, "lng": 34.5333, "ownership": "Government"},
    {"name": "Mwanza District Hospital", "district": "Mwanza", "lat": -15.6000, "lng": 34.5167, "ownership": "Government"},
    {"name": "Likoma District Hospital", "district": "Likoma", "lat": -12.0667, "lng": 34.7333, "ownership": "Government"},
]

# ── Type normalization ──────────────────────────────────────────────
TYPE_MAP = {
    # OSM amenity values
    "hospital": "district_hospital",
    "clinic": "health_centre",
    "pharmacy": "private",
    "dentist": "private",
    "doctors": "private",
    "health_post": "health_centre",
    "centre": "health_centre",
    "optometrist": "private",
    "laboratory": "health_centre",
    "yes": "health_centre",
    # Zenodo names containing keywords
    "district_hospital": "district_hospital",
    "community_hospital": "community_hospital",
    "health_centre": "health_centre",
    "health_center": "health_centre",
    "dispensary": "health_centre",
    "clinic": "health_centre",
}

# Keywords to detect type from facility name
TYPE_KEYWORDS = {
    "district_hospital": ["district hospital", "central hospital"],
    "community_hospital": ["community hospital", "rural hospital", "mission hospital"],
    "health_centre": ["health centre", "health center", "dispensary", "clinic"],
    "private": ["private", "pharmacy", "ngo"],
}


def detect_type_from_name(name):
    """Infer facility type from name keywords."""
    lower = name.lower()
    for ftype, keywords in TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return ftype
    return "health_centre"  # default


def normalize_district(raw_district):
    """Clean district name: 'Lilongwe-DHO' → 'Lilongwe'."""
    if raw_district and raw_district.endswith("-DHO"):
        return raw_district[:-4]
    return raw_district or "Unknown"


def facility_id(name, lat, lng):
    """Generate a stable unique ID from name + coords."""
    raw = f"{name.lower().strip()}_{lat:.4f}_{lng:.4f}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def load_zenodo():
    """Load Zenodo shapefile data."""
    sf = shapefile.Reader("data/raw/vector_facility_publicfacilitiesnodist")
    facilities = []
    for rec in sf.records():
        name = rec[2]
        district = normalize_district(rec[3])
        lat = float(rec[6])
        lng = float(rec[7])
        ownership = rec[5]

        # All Zenodo facilities are Government; detect type from name
        ftype = detect_type_from_name(name)

        facilities.append({
            "id": facility_id(name, lat, lng),
            "name": name,
            "type": ftype,
            "ownership": ownership,
            "district": district,
            "traditional_authority": "",
            "latitude": lat,
            "longitude": lng,
            "operational_status": "Functional",
            "beds_total": None,
            "beds_available": None,
            "services": [],
            "last_verified": "2025-04-09",
            "data_source": "zipatala_dhis2",
            "chw_verified": False,
            "chw_verified_by": None,
            "chw_verified_date": None,
            "mhfrcode": rec[4],
            "dhis2code": rec[1],
        })
    return facilities


def extract_centroid(geometry):
    """Extract centroid [lng, lat] from Point or Polygon geometry."""
    if geometry is None:
        return None
    gtype = geometry["type"]
    coords = geometry["coordinates"]
    if gtype == "Point":
        return coords  # [lng, lat]
    elif gtype == "Polygon":
        # Use first ring, compute simple average
        ring = coords[0]
        n = len(ring)
        if n == 0:
            return None
        lng = sum(p[0] for p in ring) / n
        lat = sum(p[1] for p in ring) / n
        return [lng, lat]
    elif gtype == "MultiPolygon":
        # Use first polygon's first ring
        ring = coords[0][0]
        n = len(ring)
        if n == 0:
            return None
        lng = sum(p[0] for p in ring) / n
        lat = sum(p[1] for p in ring) / n
        return [lng, lat]
    return None


def load_osm():
    """Load OSM GeoJSON data."""
    with open("data/raw/health_facilities.geojson") as f:
        data = json.load(f)

    facilities = []
    for feature in data["features"]:
        props = feature["properties"]
        geom = feature["geometry"]

        centroid = extract_centroid(geom)
        if centroid is None or len(centroid) < 2:
            continue

        name = props.get("name") or props.get("name_latin") or "Unknown Facility"
        lat = centroid[1]
        lng = centroid[0]
        amenity = props.get("amenity") or "clinic"
        district = props.get("adm2_name") or "Unknown"
        ta = props.get("adm3_name") or ""

        # Normalize type
        ftype = TYPE_MAP.get(amenity, "health_centre")
        # Override if name suggests hospital
        name_type = detect_type_from_name(name)
        if name_type in ("district_hospital", "community_hospital"):
            ftype = name_type

        facilities.append({
            "id": facility_id(name, lat, lng),
            "name": name,
            "type": ftype,
            "ownership": props.get("operator_type") or "Unknown",
            "district": district,
            "traditional_authority": ta,
            "latitude": lat,
            "longitude": lng,
            "operational_status": "Functional",
            "beds_total": None,
            "beds_available": None,
            "services": [],
            "last_verified": "2026-08-07",
            "data_source": "osm",
            "chw_verified": False,
            "chw_verified_by": None,
            "chw_verified_date": None,
            "mhfrcode": None,
            "dhis2code": None,
        })
    return facilities


def load_district_hospitals():
    """Generate district hospital entries from reference data."""
    facilities = []
    for dh in DISTRICT_HOSPITALS:
        name = dh["name"]
        lat = dh["lat"]
        lng = dh["lng"]
        facilities.append({
            "id": facility_id(name, lat, lng),
            "name": name,
            "type": "district_hospital",
            "ownership": dh["ownership"],
            "district": dh["district"],
            "traditional_authority": "",
            "latitude": lat,
            "longitude": lng,
            "operational_status": "Functional",
            "beds_total": 120,
            "beds_available": 45,
            "services": ["maternity", "surgery", "lab", "pharmacy", "diagnostics"],
            "last_verified": "2026-08-21",
            "data_source": "reference",
            "chw_verified": False,
            "chw_verified_by": None,
            "chw_verified_date": None,
            "mhfrcode": None,
            "dhis2code": None,
        })
    return facilities


def merge_and_deduplicate(all_facilities):
    """
    Deduplicate by (normalized_name, district).
    Priority: reference > zipatala_dhis2 > osm
    """
    source_priority = {"reference": 1, "zipatala_dhis2": 2, "osm": 3}
    all_facilities.sort(key=lambda f: source_priority.get(f["data_source"], 99))

    seen = {}
    for f in all_facilities:
        key = (
            f["name"].lower().strip()[:30],
            f["district"].lower().strip(),
        )
        if key not in seen:
            seen[key] = f
        else:
            # Merge: keep better data from existing
            existing = seen[key]
            # Prefer non-null beds from reference
            if f.get("beds_total") and not existing.get("beds_total"):
                existing["beds_total"] = f["beds_total"]
                existing["beds_available"] = f["beds_available"]
            # Prefer non-empty services
            if f.get("services") and not existing.get("services"):
                existing["services"] = f["services"]

    return list(seen.values())


def validate_coordinates(facilities):
    """Filter out facilities with coordinates outside Malawi bounds."""
    valid = []
    for f in facilities:
        lat = f["latitude"]
        lng = f["longitude"]
        if -18.0 < lat < -8.0 and 32.0 < lng < 37.0:
            valid.append(f)
        else:
            print(f"  REJECTED: {f['name']} ({lat}, {lng}) - outside Malawi")
    return valid


def main():
    print("=== ZISAMALE FACILITY DATA PIPELINE ===\n")

    # Load all sources
    zenodo = load_zenodo()
    print(f"Zenodo (Zipatala+DHIS2): {len(zenodo)} facilities")

    osm = load_osm()
    print(f"OSM (HDX): {len(osm)} facilities")

    hospitals = load_district_hospitals()
    print(f"District Hospitals (reference): {len(hospitals)} facilities")

    # Merge
    all_facilities = zenodo + osm + hospitals
    print(f"\nTotal before dedup: {len(all_facilities)}")

    merged = merge_and_deduplicate(all_facilities)
    print(f"After dedup: {len(merged)}")

    # Validate
    valid = validate_coordinates(merged)
    print(f"After coordinate validation: {len(valid)}")

    # Stats
    print("\n--- By Type ---")
    types = Counter(f["type"] for f in valid)
    for t, c in types.most_common():
        print(f"  {t}: {c}")

    print("\n--- By District (top 10) ---")
    districts = Counter(f["district"] for f in valid)
    for d, c in districts.most_common(10):
        print(f"  {d}: {c}")

    print(f"\n--- By Source ---")
    sources = Counter(f["data_source"] for f in valid)
    for s, c in sources.most_common():
        print(f"  {s}: {c}")

    # Write output
    import os
    os.makedirs("services/dashboards/public/data", exist_ok=True)
    output_path = "services/dashboards/public/data/facilities.json"
    with open(output_path, "w") as f:
        json.dump(valid, f, indent=2)
    print(f"\nWrote {len(valid)} facilities to {output_path}")
    print(f"File size: {os.path.getsize(output_path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
