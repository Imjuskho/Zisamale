# CONTEXT — Zisamale Domain Vocabulary

Living glossary of named concepts introduced when deepening modules.
Add a term here the first time a module crystallizes around it.

## Sync & Data Flow

**Sync engine** (`services/api/app/sync/engine.py`)
The single batch-upsert module every edge-to-server ingest goes through.
Owns: transform pipeline, per-item conflict receipts (created/updated/conflict/failed),
owner binding from the token, GPS coarsening, date parsing. Routers are thin adapters.

**Catchment scope guard** (`services/api/app/deps.py`)
Session-level row filter injected into every ORM SELECT (a `do_orm_execute`
listener appends `WHERE`, NOT `with_loader_criteria`): visits/households pin
on `chw_id`, pregnancies/children pin on `chw_id` **or** their owning
household (scoring/ingest write paths never fill the raw column). A
value-capturing criteria lambda is rejected here — the lambda registry can
reuse a stale compiled form and stitch another CHW's scope into a session.
Body- and path-supplied `chw_id` are never trusted for CHW tokens —
cross-catchment paths get 403 at the seam. Roles accept `*` for
any-authenticated reads. Opt in per-endpoint via `scoped_db(...)`.
Malformed UUID path ids return the empty contract (200 + `[]`), never a 500.

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

**Recency helpers** (`services/dashboards/src/utils/recency.ts`)
`hoursSince` / `daysSince` / `isOlderThan` — the only staleness arithmetic in
the dashboards. Every helper takes an injectable `now`; unparseable input is
null/false, never NaN. No component subtracts timestamps by hand.

**District → map adapter** (`services/dashboards/src/components/map/districtGeo.ts`)
Owns the translation from API district rows to map features: `slugify`,
`LEVEL_TO_RISK` band representatives, `toMapDistricts`, and `mergeRiskData`.
Dashboards never re-derive ids or fabricate scores inline.

## Knowledge Translation & Self-Care (SAMALA-AI)

**Research study** (`services/api/app/models/knowledge.py`)
A published study ingested into the system. Anchored to a geographic location
(district/TA/facility) where the research was conducted. Tracks consent status
from researchers before translation. Status lifecycle: discovered → under_review
→ approved → synthesized → deployed.

**Knowledge asset** (`services/api/app/models/knowledge.py`)
A synthesized communication asset derived from a research study. Typed as
chw_brief, video, audio, poster, flipbook, sms, infographic, or community_talk.
Every asset carries dual-language content (English + Chichewa). Status lifecycle:
draft → review → approved → deployed.

**Knowledge deployment** (`services/api/app/models/knowledge.py`)
A record of an asset being delivered to a community. Tracks delivery method
(home_visit, community_meeting, clinic, school, radio, sms, poster),
households/individuals reached, and pre/post knowledge scores for impact
measurement.

**Self-care guide** (`services/api/app/models/knowledge.py`)
Structured health information with severity levels (info/warning/emergency).
Content fields are bilingual: what_it_is, what_to_do_now, what_not_to_do,
when_to_seek_help, prevention — each with a Chichewa counterpart. CHWs use
these during home visits; the app surfaces relevant guides based on risk
assessment from MAMA-AI.

**Community health talk** (`services/api/app/models/knowledge.py`)
A structured 15-minute group health education session template. Contains
talking points, discussion questions, and pledge card text — all bilingual.
Derived from research studies. CHWs deliver these at village meetings.

**SAMALA summary** (`/api/v1/samala/summary`)
Aggregate endpoint for the DHO/MoHP dashboard: total studies, assets by type,
deployments, households reached, average knowledge change, topic coverage.

**Content quality gates** (`services/api/app/routers/knowledge.py`)
Status transitions enforce: consent must be granted before review, Chichewa
title required before approval, reviewer identity required for approval.
No asset deploys without at least one deployment record.
