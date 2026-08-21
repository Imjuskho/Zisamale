# ADR-005: De-identify at the Sync Boundary

## Status
Accepted

## Context
The technical prompt and Malawi Data Protection Act (2021) require patient identifiers and exact GPS to remain on-device. Cloud analytics should use pseudonymized household IDs and TA-level location. The visits table currently accepts full-precision `gps_lat` / `gps_lon`. Pregnancy and child rows still store names — that is existing schema debt, not a pattern to extend.

## Decision
At visit and referral ingest:

1. Drop or coarsen coordinates to ~1 km (two decimal degrees) before persisting. Exact GPS may exist in the on-device SQLite row only.
2. Do not add name, phone, or photo-base64 fields to the cloud visit contract. Photos remain a queued upload with separate access control.
3. `chw_override` without `chw_override_reason` is rejected. Overrides are the training signal; an empty reason is not a label.
4. Override listings return clinical/AI fields and pseudonymous IDs, not notes that may contain names, unless the caller is the originating CHW.

Household display names on the CHW priority list are allowed for the capturing CHW (they already have the register). They must not appear on MoHP national endpoints.

## Consequences
- **Positive:** Sync payloads stay lawful as volume grows; later warehouse jobs do not inherit pinpoint GPS.
- **Negative:** Maps at household resolution cannot be rebuilt from cloud visits. Facility and TA maps remain PostGIS on those tables.
- **Follow-up:** Encrypt on-device DB (SQLCipher) and stop storing `woman_name` / `child_name` in Postgres once iCHIS is the system of record.
