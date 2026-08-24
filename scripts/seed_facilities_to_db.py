#!/usr/bin/env python3
"""
SEED FACILITIES INTO POSTGRESQL
Reads facilities.json and generates SQL INSERT statements
for the existing Zisamale schema.
"""

import json
import uuid

FACILITIES_JSON = "services/dashboards/public/data/facilities.json"
OUTPUT_SQL = "scripts/seed_facilities.sql"

# Map normalized types to schema facility_type values
TYPE_MAP = {
    "district_hospital": "district_hospital",
    "community_hospital": "community_hospital",
    "health_centre": "health_centre",
    "private": "private",
}

def gen_uuid():
    return str(uuid.uuid4())

def main():
    with open(FACILITIES_JSON) as f:
        facilities = json.load(f)

    print(f"Loaded {len(facilities)} facilities from {FACILITIES_JSON}")

    # Collect unique districts
    districts = {}
    for fac in facilities:
        d = fac["district"]
        if d not in districts:
            districts[d] = gen_uuid()

    # Collect unique TAs
    tas = {}
    for fac in facilities:
        ta = fac.get("traditional_authority", "")
        d = fac["district"]
        key = f"{d}|{ta}"
        if ta and key not in tas:
            tas[key] = (gen_uuid(), districts[d], ta)

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- SEED DATA: Real Malawi Health Facilities")
    lines.append("-- Generated from Zenodo + OSM + Reference data")
    lines.append("-- ============================================================")
    lines.append("")

    # Disable triggers for bulk insert
    lines.append("SET session_replication_role = 'replica';")
    lines.append("")

    # Insert districts
    lines.append("-- Districts (29 districts of Malawi)")
    for name, did in districts.items():
        safe_name = name.replace("'", "''")
        lines.append(
            f"INSERT INTO districts (district_id, name, region, created_at) "
            f"VALUES ('{did}', '{safe_name}', 'Southern', NOW()) "
            f"ON CONFLICT DO NOTHING;"
        )
    lines.append("")

    # Insert TAs
    lines.append("-- Traditional Authorities")
    for key, (ta_id, district_id, ta_name) in tas.items():
        safe_ta = ta_name.replace("'", "''")
        lines.append(
            f"INSERT INTO traditional_authorities (ta_id, district_id, name, created_at) "
            f"VALUES ('{ta_id}', '{district_id}', '{safe_ta}', NOW()) "
            f"ON CONFLICT DO NOTHING;"
        )
    lines.append("")

    # Insert facilities
    lines.append(f"-- Facilities ({len(facilities)} real Malawi health facilities)")
    for fac in facilities:
        fid = gen_uuid()
        name = fac["name"].replace("'", "''")
        ftype = TYPE_MAP.get(fac["type"], "health_centre")
        district_id = districts.get(fac["district"])
        ta = fac.get("traditional_authority", "")
        ta_id = tas.get(f"{fac['district']}|{ta}", (None, None, None))[0]
        lat = fac["latitude"]
        lng = fac["longitude"]
        beds = fac.get("beds_total") or "NULL"
        has_maternity = "TRUE" if "maternity" in fac.get("services", []) else "FALSE"
        has_lab = "TRUE" if "lab" in fac.get("services", []) else "FALSE"
        has_pharmacy = "TRUE" if "pharmacy" in fac.get("services", []) or fac["type"] in ("health_centre", "district_hospital", "community_hospital") else "FALSE"

        district_id_val = f"'{district_id}'" if district_id else "NULL"
        ta_id_val = f"'{ta_id}'" if ta_id else "NULL"

        lines.append(
            f"INSERT INTO facilities (facility_id, name, facility_type, district_id, ta_id, "
            f"latitude, longitude, geom, bed_count, has_maternity, has_lab, has_pharmacy, "
            f"is_active, created_at, updated_at) "
            f"VALUES ('{fid}', '{name}', '{ftype}', {district_id_val}, {ta_id_val}, "
            f"{lat}, {lng}, ST_SetSRID(ST_MakePoint({lng}, {lat}), 4326), "
            f"{beds}, {has_maternity}, {has_lab}, {has_pharmacy}, "
            f"TRUE, NOW(), NOW()) "
            f"ON CONFLICT DO NOTHING;"
        )

    lines.append("")
    lines.append("SET session_replication_role = 'origin';")
    lines.append("")
    lines.append(f"-- Seeded {len(facilities)} facilities across {len(districts)} districts")

    with open(OUTPUT_SQL, "w") as f:
        f.write("\n".join(lines))

    print(f"Wrote {len(facilities)} INSERT statements to {OUTPUT_SQL}")
    print(f"Districts: {len(districts)}")
    print(f"Traditional Authorities: {len(tas)}")
    print(f"File size: {len(chr(10).join(lines)) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
