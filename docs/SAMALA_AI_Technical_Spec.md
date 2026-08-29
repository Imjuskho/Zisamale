# SAMALA-AI: Knowledge Translation & Self-Care — Full Technical Specification

**Referenced from:** `docs/Zisamale_Technical_Development_Prompt.md` §3.4
**Status:** Spec only — no implementation yet. This file fills the gap that §3.4 pointed to.

---

## 0. Why this engine exists

The other three engines move data *toward* the system: household → risk score → alert → response. SAMALA-AI moves knowledge in the opposite direction — from research and standing clinical guidance *out* to the people it concerns — and closes a gap the other three don't touch: research gets conducted on Malawian communities, gets published, and routinely never reaches the people it was about or gets translated into something they can act on. SAMALA-AI is the platform's "gatekeeper" function in the literal sense: it doesn't generate new clinical knowledge, it ensures existing knowledge actually passes from those who hold it to those who need to act on it. "Kuzisamala" — to take care of yourself — is the platform's own namesake; this is the engine that makes that literal, and the other three engines exist in service of it, not the reverse.

Two content pathways share the data model below, distinguished only by whether content is tied to a specific study:

1. **Research Translation Pathway** (study-specific). A study gets discovered/logged as a `research_studies` row → researcher contact and consent are obtained → findings are synthesized into `knowledge_assets` → assets are packaged into a `knowledge_deployments` push scoped to the *exact community the study was conducted on* → CHWs deliver it with the explicit framing "this is what the study found, here is how you can use it."
2. **Standing Self-Care Pathway** (not study-specific). MoHP/PHIM-curated `self_care_guides` and `community_health_talks` that live in the CHW app's content library on an ongoing basis, refreshed over time, surfaced contextually off MAMA-AI/ULALO-AI signals (see §4).

---

## 1. Data Model

Postgres/PostGIS, async SQLAlchemy — follows the same conventions as every existing model in `services/api/app/models/`: UUID primary keys (`uuid.uuid4` default), FKs to the existing geography tables (district/TA/facility — do not invent a parallel geography hierarchy), `created_at`/`updated_at` timestamps, enums as Python `Enum` classes rather than free strings where a fixed state machine is involved (status/review fields below — the audit of the existing codebase found free-string fields like `facility_type` costly to retrofit later; don't repeat that here).

```sql
-- Research studies, anchored to the community they were conducted on
CREATE TABLE research_studies (
    study_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors JSONB,                          -- array of {name, affiliation}
    publication_source TEXT,
    doi_or_url TEXT,
    topic TEXT NOT NULL,                    -- e.g. "HIV", "malaria", "maternal nutrition"
    district_id UUID REFERENCES districts(district_id),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    facility_id UUID REFERENCES facilities(facility_id),
    population_described TEXT,              -- free text, e.g. "adolescent girls 15-19"
    publication_date DATE,
    key_findings JSONB,                     -- structured findings pulled out for translation
    researcher_name TEXT,
    researcher_org TEXT,
    researcher_email TEXT,
    status TEXT NOT NULL DEFAULT 'discovered',
        -- enum: discovered | contacting_researcher | researcher_engaged
        --       | synthesizing | assets_ready | deployed | completed
    consent_status TEXT NOT NULL DEFAULT 'pending',
        -- enum: not_required | pending | obtained | declined
        -- NOTE: this is distinct from ADR-005's per-visit patient consent. This tracks whether
        -- the researcher/institution has confirmed that redistributing already-published
        -- findings back to the community is appropriate. A study cannot leave 'synthesizing'
        -- status without consent_status = obtained or not_required.
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Synthesized communication assets (study-linked or standing self-care content)
CREATE TABLE knowledge_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_study_id UUID REFERENCES research_studies(study_id),  -- NULL = standing content
    title TEXT NOT NULL,
    summary TEXT,
    asset_type TEXT NOT NULL,
        -- enum: video | audio | infographic | sms_script | dialogue_script | print_flyer
    language TEXT NOT NULL,                 -- chichewa | tumbuka | yao | english | ...
    literacy_level TEXT NOT NULL DEFAULT 'low',  -- low | standard
    media_url TEXT,                         -- nullable until produced
    review_status TEXT NOT NULL DEFAULT 'draft',
        -- enum: draft | researcher_reviewed | mohp_approved | published | retired
        -- A study-linked asset cannot reach 'published' without researcher_reviewed first —
        -- accuracy on someone else's findings is the researcher's call, not staff's.
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Structured, severity-leveled self-care guides (standing content, MAMA-AI-triggered)
CREATE TABLE self_care_guides (
    guide_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,                 -- e.g. "maternal", "child_nutrition", "hygiene"
    severity_level TEXT NOT NULL,            -- enum: routine | caution | seek_care | emergency
    what_to_do JSONB,                        -- structured steps, bilingual
    what_not_to_do JSONB,
    when_to_seek_help TEXT,
    trigger_risk_categories JSONB,           -- which MAMA-AI risk_category values surface this guide
    language TEXT NOT NULL,
    audio_url TEXT,
    review_status TEXT NOT NULL DEFAULT 'draft',  -- draft | mohp_approved | published | retired
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community health talk templates (15-minute group session scripts)
CREATE TABLE community_health_talks (
    talk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    research_study_id UUID REFERENCES research_studies(study_id),  -- NULL = standing content
    topic TEXT NOT NULL,
    script JSONB,                            -- structured talking points, bilingual
    duration_minutes INTEGER DEFAULT 15,
    materials_needed JSONB,
    review_status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery + impact tracking
CREATE TABLE knowledge_deployments (
    deployment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES knowledge_assets(asset_id),
    guide_id UUID REFERENCES self_care_guides(guide_id),
    talk_id UUID REFERENCES community_health_talks(talk_id),
        -- exactly one of asset_id / guide_id / talk_id is set (CHECK constraint)
    target_district_id UUID REFERENCES districts(district_id),
    target_ta_id UUID REFERENCES traditional_authorities(ta_id),
    target_facility_id UUID REFERENCES facilities(facility_id),
    household_id UUID REFERENCES households(household_id),  -- nullable: community-level deliveries
        -- (radio, group talks) won't have one
    chw_id UUID REFERENCES users(user_id),
    delivery_channel TEXT NOT NULL,
        -- enum: chw_household_visit | community_meeting | sms_blast | radio_spot
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    follow_up_note TEXT,
    knowledge_score_before INTEGER,          -- optional pre/post measurement, 0-100
    knowledge_score_after INTEGER,
    outcome_indicator TEXT,                  -- free text, e.g. "self-reported ANC attendance"
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_research_studies_geo ON research_studies(district_id, ta_id, facility_id);
CREATE INDEX idx_knowledge_assets_study ON knowledge_assets(research_study_id);
CREATE INDEX idx_deployments_target ON knowledge_deployments(target_district_id, target_ta_id);
CREATE INDEX idx_deployments_household ON knowledge_deployments(household_id);
```

**Privacy note (extends ADR-005, does not replace it):** the raw material here is published/aggregate research about a *community*, not new individual patient data, so the risk profile differs from Visit/Household ingestion. The control that matters is `consent_status` on `research_studies`, not per-field de-identification. `knowledge_deployments.household_id` must reuse the *existing* household identifier rather than collecting any new identity field, and delivery logging goes through the same `sync/engine.py` batch-upsert path every other CHW-submitted record uses — do not build a second ingestion path for this. Follow this file's schema and route it exactly like `households.batch` in `chw_sync.py` is handled today.

**Scoping note (do not repeat the audit finding):** an earlier review of this codebase found that `dho`/`supervisor` roles have no enforced district scope despite `RBAC_MATRIX` declaring one (see `app/security/rbac.py` and every district-scoped router). SAMALA-AI's endpoints are new code — build the `user["district_id"]` check in from the start, the same way `scoped_db` already does it correctly for CHW/household data, rather than adding it to the pile of things to retrofit later.

---

## 2. API — `/api/v1/samala/*`

Matches the route list already committed to in §3.4.3 of the main prompt; this section fills in the actual request/response shapes.

```
GET/POST /api/v1/samala/studies
  POST body: title, authors[], publication_source, doi_or_url, topic,
             district_id | ta_id | facility_id, population_described,
             publication_date, key_findings, researcher_name, researcher_org, researcher_email
  GET query: ?district_id=&topic=&status=
  Role: mohp | phim | dho (research intake is staff-initiated, not CHW-initiated)

PATCH /api/v1/samala/studies/{study_id}/consent
  body: consent_status ("obtained" | "declined"), notes
  Role: mohp | phim
  Rejects transition to 'synthesizing' status while consent_status is 'pending' or 'declined'.

GET/POST /api/v1/samala/assets
  POST body: research_study_id (nullable), title, summary, asset_type, language,
             literacy_level, media_url
  GET query: ?district_id=&topic=&published=true
    -- this is the query the CHW app's Knowledge Library screen actually hits for offline
    -- caching; must be catchment-scoped and response-cacheable (see §5)
  Role: mohp | phim | dho (write); any authenticated role (read, catchment-filtered)

PATCH /api/v1/samala/assets/{asset_id}/approve
  body: review_status ("researcher_reviewed" | "mohp_approved" | "published" | "retired"), notes
  Role: mohp | phim (mohp_approved/published); researcher-facing review_status transitions
        happen out-of-band (email/portal, TBD — do not build a public researcher login for v1)

GET/POST /api/v1/samala/guides
  Same shape as /assets but for self_care_guides; POST role mohp|phim only.

GET/POST /api/v1/samala/talks
  Same shape for community_health_talks.

GET/POST /api/v1/samala/deployments
  POST body: (asset_id | guide_id | talk_id), target_district_id/ta_id/facility_id,
             household_id (nullable), chw_id, delivery_channel, follow_up_note
  -- Routes through sync/engine.py's apply_batch, same as visits/households. Do not add a
  -- second ingestion path.
  Role: chw (own deployments only, via scoped_db) | supervisor | dho | mohp | phim (read)

PATCH /api/v1/samala/deployments/{deployment_id}/impact
  body: knowledge_score_before, knowledge_score_after, outcome_indicator
  Role: chw | supervisor

GET /api/v1/samala/summary
  Dashboard aggregate: studies by status, assets by review_status, deployments by district/
  channel over a period, before/after knowledge-score deltas where measured.
  Role: dho (own district only — enforce, see scoping note above) | mohp | phim

GET /api/v1/chw/{chw_id}/knowledge-library
  Catchment-scoped bundle of published assets + guides + talks for offline caching —
  mirrors the existing GET /chw/{id}/priority-list pattern. This is the endpoint the
  Android Knowledge Library screen actually syncs against.
```

---

## 3. "Intelligence" in SAMALA-AI

Unlike the other three engines, SAMALA-AI's core value is workflow plus human-in-the-loop drafting assistance, consistent with Principle 3 (AI outputs are advisory, humans retain final authority) — not a predictive model.

- **Synthesis drafting assist:** given a `research_studies.key_findings` payload, produce a *draft* plain-language summary and dialogue-script skeleton for staff to edit — reusing the same NLG pattern already used for the Ministerial Dashboard's executive summaries (§3.3.3), applied to a different audience. Never auto-publish a draft: every `knowledge_assets` row requires a human `review_status` transition before `published`, and every study-linked asset requires `researcher_reviewed` before `mohp_approved`.
- **Relevance matching:** given a study's geography + topic, surface overlapping catchments, existing deployments, and relevant standing self-care guides, so staff aren't starting from a blank list every time.

---

## 4. Engine Integration Hooks

As committed in §3.4.4 of the main prompt:

- **MAMA-AI → SAMALA:** a visit's resulting `risk_category` is matched against `self_care_guides.trigger_risk_categories`; the matching guide ID is returned alongside the existing risk score in the visit-submission response, so the CHW app can offer it inline without an extra round trip.
- **ULALO-AI → SAMALA:** an outbreak alert reaching YELLOW/RED (§3.2.3) triggers a lookup of published prevention-topic assets/guides for the affected TA and flags them for proactive `knowledge_deployments` in the DHO dashboard's Knowledge Translation tab.
- **CHUMA-AI → SAMALA:** the Ministerial budget-scenario model (§3.3.3) includes a line item for knowledge-translation costs (asset production, printing, CHW training time) — SAMALA-AI's `summary` endpoint feeds that model, it doesn't own budget logic itself.
- **DHIS2 ← SAMALA:** aggregate knowledge-uptake indicators (deployments per district per period, average knowledge-score delta) are pushed to DHIS2 as custom data elements, following the existing outbound pattern in `integrations/dhis2.py` — do not build a second DHIS2 client.

---

## 5. CHW App Additions (Android)

- **Knowledge Library screen:** offline-cached content relevant to the CHW's own catchment, synced from `GET /chw/{chw_id}/knowledge-library`. Media (video/audio) is much larger than the JSON payloads every other sync deals with — gate large-file downloads behind `BatteryAwareSync`'s existing constraints rather than the visit-sync cadence; do not download full video libraries on a low-battery cellular connection.
- **Delivery logging:** a lightweight "shared this with the household/community" action loggable during or after a visit, feeding `knowledge_deployments` through the existing sync engine — same offline-first guarantee as everything else in the app.
- **Contextual surfacing:** after a visit, if MAMA-AI's risk_category has a matching guide, offer it inline (see §4) — suggestion only, the CHW decides whether to share it, consistent with the override-everywhere principle already enforced elsewhere in the app.

---

## 6. Dashboard Additions

- **`/samala`** (DHO/MoHP): research inventory by status, asset library, deployment map (reusing the existing map component, not a new one), reach and impact metrics.
- **`/samala/guides`** (CHW-facing web fallback, if the Android app is unavailable): category grid, severity badges, full bilingual content, audio playback.
- **Research intake form:** for MoHP/PHIM/DHO staff to log a newly discovered study — this is the literal start of the "find a study, connect with the researcher" workflow, and needs to be usable by a non-technical staff member without engineering help.

---

## 7. Suggested MVP Scope (don't build all of this before shipping something)

Given this is new surface area on an already-large system, sequence it:

1. **Standing Self-Care Pathway only.** `self_care_guides` + the MAMA-AI trigger hook (§4) + the Knowledge Library screen. No `research_studies` table needed yet. This alone delivers real value and is low-risk.
2. **One real Research Translation Pathway deployment, built by hand.** One study, one community, one set of assets, taken end-to-end through the full `research_studies` → `knowledge_assets` → `knowledge_deployments` pipeline manually, to validate the model shape before generalizing the researcher-collaboration workflow (the intake form, the consent tracking) into something staff use routinely.
3. **`knowledge_deployments` reach logging from day one**, even in the MVP — funders and MoHP will want reach numbers (deployments per district, households reached), and it is much cheaper to log from the start than to reconstruct later. This also gives the Concept Note / grant reporting a real, measurable output rather than a projected one.

---

## 8. Testing Requirements (extends §7 of the main prompt)

- Unit: consent-gating logic (a study cannot reach `synthesizing` without `consent_status` obtained/not_required; an asset cannot reach `published` without the correct review chain).
- Integration: MAMA-AI visit → guide match → CHW app response, end to end.
- Integration: `knowledge_deployments` write path through `sync/engine.py`'s `apply_batch` — confirm it gets the same conflict/idempotency handling as visits and households, not a bespoke path.
- Security: district-scope enforcement on `GET /samala/summary` and `GET /district/{district_id}` equivalents for `dho` role — this is new code, so this test should exist from the first PR, not be added later.
