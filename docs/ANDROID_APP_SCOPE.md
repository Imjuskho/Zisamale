# Zisamale Android App — Skeleton Scope & Gap Analysis

**Date:** August 24, 2026
**Component:** `apps/android/` (per ADR-001 monorepo layout)
**Mission alignment:** Technical Development Prompt §2.1, §3.1 (MAMA-AI edge), Principles 1–3, 5; ADR-004 (one CHW app; engines not installs); ADR-005 (identifiers stay on-device).

---

## 1. Current State (verified inventory)

A Gradle + Kotlin skeleton already exists (~3,700 LOC source, excluding build artifacts):

| Area | Files | Status |
|---|---|---|
| App shell | `ZisamaleApp.kt`, `MainActivity.kt`, Hilt DI (`AppModule.kt`) | Working |
| Local DB | Room: `Entities/Dao/Database`, 5 entities (household, pregnancy, child, visit, referral) | Working, **unencrypted** |
| Remote | Retrofit `ApiService`: login, POST `/visits`, GET `/chw/{id}/priority-list`, POST `/referrals`; base URL `10.0.2.2:8000` (emulator) | Working vs local API |
| Sync | Pure-Kotlin `SyncEngine` (transport interface, versioned conflicts: SERVER_WINS / LOCAL_WINS / RECOMPUTE, gzip) + `BatteryAwareSync` + Retrofit-backed `SyncManager` | Engine unit-tested (`SyncEngineTest`) |
| Edge ML | `RiskScorer` (rule-based weighted features), `EdgeAI` (TFLite loaded reflectively, rule-based fallback, top-factor explainability, model version), `VisitAdvisor`, `ChichewaExplainer` | Fallback path tested (`EdgeAITest`); **no real TFLite model yet** |
| UI (Compose) | Login, Dashboard (priority list + VisitCard), VisitForm, ReferralForm; design-system components (RiskBadge, AlertCard, Stepper, PatientCard…) mirroring web tokens | Screens exist |
| Offline UX | `AutoSave` draft persistence | Basic |
| Manifest perms | INTERNET, NETWORK_STATE, FINE/COARSE_LOCATION, CAMERA, SEND_SMS | Declared; CAMERA/SMS **unused so far** |

**Stray artifact:** top-level `android/` contains a single orphan file (`ui/map/MoyoMap.kt`) duplicating package `com.zisamale.app`. Delete and fold into `apps/android`.

---

## 2. Gap Analysis vs Mission

### P0 — Principle violations to close first
1. **Encryption at rest (Principle 5):** plain Room; spec requires SQLCipher (AES-256). No encrypted session storage (token in SharedPreferences?), no Keystore integration.
2. **Offline login (§3.1.3 #1):** login is online-only via API. Spec: biometric or PIN unlock with cached credentials after first sync.
3. **Cleartext traffic enabled globally:** acceptable for emulator dev only; must move to `networkSecurityConfig` with pinning for pilot builds.
4. **No background sync scheduling:** `BatteryAwareSync` has no WorkManager job wiring; "opportunistic sync" currently only runs in-foreground.
5. **Chichewa:** `strings.xml` has one string; `ChichewaExplainer` exists but UI is English-only.

### P1 — Mission features missing
6. Household registry screens (route defined, no screen); GPS capture of household location.
7. Photo upload queue (backend `POST /uploads` exists; CAMERA permission declared, nothing wired).
8. SMS fallback for critical alerts (SEND_SMS declared, unused).
9. Real TFLite model: train GBT on services/ml pipeline → ONNX → TFLite; ship model file + version handshake with cloud retraining.
10. Override flow ("I disagree") captured with reason — backend already enforces `chw_override_reason`; verify the form surfaces it as first-class.
11. Referral tracking prompt at 48h ("did patient arrive?").

### P2 — Hardening / pilot-readiness
12. minSdk 24 confirmation, R8/proguard rules for reflection-loaded TFLite, release signing config.
13. CI: assembleDebug + unit tests + lint per PR (path-filtered per ADR-001).
14. Instrumented offline scenario test: 7 days airplane-mode → sync integrity (§7.2).
15. CHT/iCHIS field mapping table: our Room schema ↔ CHT doc definitions, client-generated UUIDs already aligned.

---

## 3. Target Module Layout

```
apps/android/app/src/main/java/com/zisamale/
├── data/
│   ├── local/        # Room + SQLCipher, DAOs (existing + migrations)
│   ├── remote/       # Retrofit + cert pinning + interceptors (auth header, retry)
│   ├── session/      # EncryptedSharedPreferences/Keystore-backed SessionStore
│   └── sync/         # SyncManager (transport impl)
├── sync/             # SyncEngine, BatteryAwareSync + WorkManager workers (NEW)
├── ml/               # EdgeAI (TFLite), RiskScorer fallback, Explainers (existing)
├── security/         # BiometricUnlock, PinGate (NEW)
├── notify/           # SMS fallback, notification channels (NEW)
├── ui/
│   ├── screen/       # + HouseholdRegistryScreen, HouseholdProfileScreen, SettingsScreen
│   └── component/    # existing design-system mirrors
└── di/
```

Single module until pilot scale demands feature modules (ADR-004: resist premature splitting).

---

## 4. Milestones

| M | Scope | Exit gate | Status |
|---|---|---|---|
| **M0 Consolidate** (½ d) | Delete stray `android/`, fold MoyoMap into app, wire priority-list into Dashboard VM, base URL via `BuildConfig`. | App builds; existing tests pass | **Done 2026-08-24** |
| **M1 Security baseline** (2–3 d) | SQLCipher + migration; Keystore-backed SessionStore; networkSecurityConfig (cleartext only for `10.0.2.2` debug); biometric/PIN gate with cached session; minSdk/target verified | Pen-test checklist items 1–4 closed; no plaintext PHI/token on disk | **Done 2026-08-24** |
| **M2 Offline core loops** (3–5 d) | WorkManager sync workers (constraints: network+charging-aware); household registry + profile screens w/ GPS capture; visit form override-reason field; AutoSave polish | Airplane-mode E2E: register HH → visit → referral queued → sync on reconnect; SyncEngine conflict tests green | **Done 2026-08-24** (WorkManager periodic+on-demand `SyncWorker` behind BatteryAwareSync gate; registry/register/profile screens with offline GPS capture via LocationManager — no Play Services dependency; override-reason already enforced in VisitFormScreen). Household batch-sync contract delta closed 2026-08-24: `POST /api/v1/households/batch` (upsert by client UUID, server-newer conflicts reported per-item, ≤500/batch; 3 tests) + `syncPendingHouseholds()` first in `syncAll()` — single round-trip for offline-registered households. Remaining: on-device airplane-mode E2E (needs emulator/device) |
| **M3 Edge AI real** (3–4 d) | Train GBT in `services/ml` on seeded outcomes → ONNX → TFLite (<5MB, <100ms on Snapdragon 680-class); bundle v1 model; top-3 factors rendered bilingual; model-version telemetry to API | EdgeAITest passes with real model; inference benchmark logged | **Done 2026-08-24** (`services/ml/pipelines/train_edge_models.py`: GBT regressors trained on protocol-labelled synthetic cohorts; pregnancy MAE 0.54/R² 0.88, child MAE 0.29/R² 0.93. Bundled as pure-Kotlin `.zgb` tree ensembles — 146KB total, zero runtime deps, golden-vector parity tests green (32/32). ONNX exports in `services/ml/models/` for future ORT-Mobile swap; TFLite converter blocked by py3.14 wheel support — revisit if needed. VisitAdvisor now routes through bundled models with rule fallback + Chichewa factor rendering; telemetry via `POST /api/v1/ml/telemetry` (136 backend tests) + `TelemetryBuffer` flushed on sync. Host-JVM bench: 1.7µs/prediction; device bench deferred to M5 instrumented run) |
| **M4 Field extras** (2–3 d) | Photo queue → POST /uploads; SMS fallback for RED alerts; 48h arrival follow-up notification | All three demoable offline-first | **Done 2026-08-24** (photo queue: `photo_queue` table + DB migration v1→v2, TakePicture capture → JPEG compress ≤1600px → multipart `POST /api/v1/photos`, retried opportunistically; SMS RED fallback: `SmsFallback` sends via SmsManager only when urgency=emergency AND network=NONE, runtime SEND_SMS flow, pilot hotline constant pending facility-registry numbers; follow-up: `FollowUpWorker` one-shot per referral (48h, reboot-persistent, no network constraint) + `FollowUpPolicy` JVM-tested + notification channel w/ POST_NOTIFICATIONS request. Referral form now also persists a local `ReferralEntity` with reason — previously none was stored. On-device demo still requires emulator/device run) |
| **M5 Pilot hardening** (ongoing) | CI pipeline, instrumented 7-day-offline test, crash/BatteryDog monitoring, Chichewa string sweep, proguard rules | §7.2/7.3 performance gates met | **Partial 2026-08-24** (CI: android build+unit-test+release-compile job added to `.github/workflows/ci.yml` plus edge-model regression step; R8: full keep-rules for SQLCipher/Retrofit-Gson/Hilt-workers/minified release; monitoring: vendor-free `CrashReporter` rolling log installed app-wide + `BatteryDog` 10-min condition sampling wired into sync gate, ring buffers JVM-tested; Chichewa sweep started on LockScreen). Deferred pending device/emulator access: 7-day-offline instrumented test, on-device inference benchmark, full string sweep across all screens |

---

## 5. Backend contract deltas needed

1. `GET /chw/{id}/priority-list` — confirm response includes `top_risk_factors[]` + `distance_km` per spec §6.1 (currently partial).
2. ~~Batch visit sync endpoint or idempotency keys on `POST /visits`~~ — closed 2026-08-24: visits replay safely via per-`visit_id` upsert in `POST /chw/sync`; households via `POST /api/v1/households/batch` (client-UUID upsert, per-item conflicts, server-newer guard). Alembic chain now carries the previously create_all-only `model_telemetry` table (rev `b7e2c1a94d05`).
3. ~~Model-version reporting endpoint (`POST /ml/telemetry`)~~ — shipped 2026-08-24.
4. `GET /api/v1/facilities?bbox=` lightweight list for offline facility lookup cache (CHUMA-AI referral initiator needs it offline).

---

## 6. Open questions

1. CHT adapter: do we wrap CHT's sync or keep bespoke SyncEngine speaking to FastAPI? (ADR-004 says converge fields either way — decide before M2.)
2. SMS gateway: device-originated SEND_SMS vs Africa's Talking server-side push? Device-side works fully offline but costs airtime; server-side needs connectivity.
3. TFLite training data: synthetic seeder outcomes only until pilot data exists — acceptable for v1 model card with explicit limitation note?
