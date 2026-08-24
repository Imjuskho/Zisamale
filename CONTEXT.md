# CONTEXT — Zisamale Domain Vocabulary

Living glossary of named concepts introduced when deepening modules.
Add a term here the first time a module crystallizes around it.

## Sync & Data Flow

**Sync engine** (`services/api/app/sync/engine.py`)
The single batch-upsert module every edge-to-server ingest goes through.
Owns: transform pipeline, per-item conflict receipts (created/updated/conflict/failed),
owner binding from the token, GPS coarsening, date parsing. Routers are thin adapters.

**Catchment scope guard** (`services/api/app/deps.py`)
Session-level row filter (`with_loader_criteria`) that pins Visit/Household queries
to the CHW identity inside the JWT. Body-supplied `chw_id` is never trusted for
CHW tokens. Opt in per-endpoint via `scoped_db(...)`.

**Alert emission point** (`services/api/app/alerts/service.py`)
`emit_alert()` is the only way an alert enters the system. Normalizes risk to a
canonical 0–1 scale, derives alert_level, dedupes by uuid5 idempotency key,
and defers delivery fan-out until after commit (`dispatch_alert`).

## Presentation

**Risk scale** (`services/dashboards/src/design/riskScale.ts`)
One palette + threshold set (<0.3 low / <0.6 medium / <0.8 high / else critical)
shared by map polygons, badges, legend, panels. Tailwind `risk.*` tokens mirror it.

**Registry facility** (`services/dashboards/src/types/index.ts`)
The facility domain model (MHFR-derived). Fields the backend does not serve yet
are `null`; UI renders "Unverified" instead of inventing values.

**Facility data adapters** (`services/dashboards/src/services/facilityService.ts`)
LIVE adapter = `api.getRegistryFacilities()`; EMBEDDED adapter = curated
`public/data/facilities.json`. Declared fallback, one read path.

**Translation seam** (`useT()` in `src/components/design/LanguageContext.tsx`)
Components translate by key alone; language comes from context, never props
or inline ternaries. Completeness test guards en+ny parity.
