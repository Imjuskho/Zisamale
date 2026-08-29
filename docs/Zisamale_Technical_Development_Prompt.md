# ZISAMALE PLATFORM: TECHNICAL DEVELOPMENT PROMPT
## For Engineering Team -- Version 1.0

---

## OVERVIEW

Build **Zisamale**, an AI-augmented community health intelligence platform for Malawi. The platform integrates four engines into Malawi's existing digital health infrastructure (DHIS2, iCHIS/CHT, LMIS): three built around collecting new data and acting on it (MAMA-AI, ULALO-AI, CHUMA-AI), and a fourth — **SAMALA-AI** — built around the reverse direction: taking research and knowledge that already exists and making it reach, and change the lives of, the communities it concerns. "Kuzisamala" — to take care of yourself — is the platform's own namesake; SAMALA-AI is the engine that makes that literal. It is **offline-first, edge-AI capable, and human-in-the-loop by design**.

**Target users:** 450 Community Health Workers (CHWs/HSAs), 3 District Health Offices, 45 health facilities, and the Ministry of Health (MoHP).

**Deployment environment:** Rural Malawi -- unreliable connectivity, limited electricity, low-end Android devices, high humidity and dust.

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Diagram

EDGE LAYER (Android, Offline-First)
  MAMA-AI Mobile App (Kotlin)
    - On-device risk scoring
    - Prioritized visit list
    - iCCM decision support
  ULALO-AI Symptom Reporter (Kotlin)
    - Offline symptom capture
    - GPS tagging
    - Photo upload (queued)
  CHUMA-AI Referral Initiator (Kotlin)
    - Offline facility lookup
    - Referral form
  SAMALA-AI Knowledge Library (Kotlin)
    - Offline-cached content library (video/audio/flyers), catchment-scoped
    - Delivery logging ("shared with household/community")
  CHT / iCHIS Sync Adapter
    - SQLite local DB (encrypted)
    - Sync when connectivity available
    - SMS fallback for critical alerts

CLOUD LAYER (AWS / Azure / GCP -- Malawi region or South Africa)
  API GATEWAY (Kong / AWS API Gateway)
    - Rate limiting, auth (OAuth2 + API keys)
    - Request logging, audit trail
  MAMA-AI Cloud Service (Python/FastAPI)
    - Model retraining
    - Aggregate analytics
    - Dashboard data feed
  ULALO-AI Cloud Service (Python/FastAPI)
    - Time-series forecasting
    - Spatial clustering
    - Alert generation
  CHUMA-AI Cloud Service (Python/FastAPI)
    - Demand forecasting
    - Multi-criteria referral optimization
    - Budget modeling
  SAMALA-AI Cloud Service (Python/FastAPI)
    - Research study intake and status tracking
    - Knowledge asset review/approval workflow
    - Knowledge translation program scoping and reach tracking
  INTEGRATION LAYER
    - DHIS2 API Adapter
    - iCHIS/CHT API Adapter
    - LMIS API Adapter
    - Climate Data API (CHIRPS, ERA5, MODIS)
    - SMS Gateway
  DATA WAREHOUSE (PostgreSQL + PostGIS / TimescaleDB)
    - Encrypted at rest (AES-256)
    - Row-level security
    - Automated backups

DASHBOARD LAYER
  DHO Dashboard (React/Vue)
    - Alert inbox, risk maps, CHW performance, response tracking
  MoHP Dashboard (React/Vue)
    - National surveillance, policy target tracking, ministerial briefings
  CHUMA Policy Dashboard (React/Vue)
    - Budget forecasting, resource optimization, NLG summaries

### 1.2 Core Principles

1. **Offline-First:** The CHW app must function fully without internet. Sync is opportunistic, not required.
2. **Edge AI:** Critical triage and risk scoring must run on-device. Cloud models are for retraining and aggregation only.
3. **Human-in-the-Loop:** All AI outputs are advisory. CHWs, clinicians, and DHO staff retain final authority. Override is always possible and logged.
4. **DHIS2-Native:** Do not build parallel data collection. Integrate with existing iCHIS forms and DHIS2 data sets.
5. **Security-by-Design:** End-to-end encryption, de-identification at aggregation, compliance with Malawi Data Protection Act (2021).
6. **Low-Bandwidth:** All sync operations must be optimized for 2G/3G. Image compression, delta sync, batch uploads.

---

## 2. TECHNOLOGY STACK

### 2.1 CHW Mobile App (Edge Layer)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | Kotlin (Android) | Native performance, robust offline support, CHT-compatible |
| Offline DB | SQLite (SQLCipher encrypted) | Lightweight, proven, encrypted at rest |
| Sync Engine | CHT Sync / custom adapter | Aligns with existing iCHIS infrastructure |
| Edge ML | TensorFlow Lite | On-device inference, low latency, no connectivity needed |
| Maps | Mapbox SDK (offline tiles) | Offline map viewing for CHW catchment areas |
| UI Framework | Jetpack Compose | Modern, responsive, accessible |
| Min Android Version | API 24 (Android 7.0) | Covers 95%+ of devices in Malawi |
| Target Devices | $100-180 ruggedized Android phones | Samsung A14, Nokia C32, or equivalent |

### 2.2 Cloud Services (Analytics Layer)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| API Framework | Python + FastAPI | High performance, async, easy ML integration |
| ML Pipeline | Python + scikit-learn / XGBoost / Prophet | Mature, well-documented, interpretable |
| Deep Learning | PyTorch (exploratory LSTM) | Flexible, good time-series support |
| Data Warehouse | PostgreSQL + PostGIS + TimescaleDB | Relational, geospatial, time-series optimized |
| Cache | Redis | Session management, rate limiting, alert queuing |
| Message Queue | RabbitMQ / AWS SQS | Async job processing, alert distribution |
| Containerization | Docker + Kubernetes | Scalable, reproducible deployments |
| Cloud Provider | AWS (Cape Town region) or Azure (South Africa North) | Regional latency, data sovereignty alignment |
| CI/CD | GitHub Actions | Automated testing, deployment |

### 2.3 Dashboard Layer

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | React + TypeScript | Component-based, type-safe, large ecosystem |
| Visualization | D3.js + Recharts + Mapbox GL | Custom charts, interactive maps |
| State Management | Redux Toolkit | Predictable state for complex dashboards |
| UI Library | Material-UI / Chakra UI | Accessible, responsive, fast to build |
| NLG Engine | Python + GPT-based summarization (OpenAI API or local LLM) | Natural language policy summaries |

### 2.4 Integration Layer

| System | Integration Method | Data Flow |
|--------|-------------------|-----------|
| DHIS2 | REST API (v2.38+) | Pull: weekly epidemiological data, facility metadata. Push: AI-generated indicators, alert flags |
| iCHIS / CHT | CHT API + CouchDB sync | Bidirectional: CHW forms, household data, pregnancy registers |
| LMIS | REST API (or CSV export if API unavailable) | Pull: commodity stock levels, consumption rates, supply chain data |
| Climate APIs | HTTP REST (CHIRPS, ERA5, MODIS) | Pull: daily rainfall, temperature, humidity, flood extent |
| SMS Gateway | Africa's Talking API / Twilio | Push: critical alerts to DHOs, DRRTs, CHW supervisors |

---

## 3. ENGINE SPECIFICATIONS

### 3.1 MAMA-AI: Maternal & Child Health Risk Stratification

#### 3.1.1 Data Model (CHW App Local DB)

SQL Schema (SQLite, SQLCipher encrypted):

-- Household Registry
CREATE TABLE households (
    household_id TEXT PRIMARY KEY,
    chw_id TEXT NOT NULL,
    gps_lat REAL,
    gps_lon REAL,
    ta_name TEXT,
    village_name TEXT,
    water_source TEXT,
    sanitation_type TEXT,
    food_security_score INTEGER, -- 1-5
    distance_to_facility_km REAL,
    transport_cost_mwk REAL,
    sync_status TEXT DEFAULT 'pending',
    last_updated TIMESTAMP
);

-- Pregnancy Tracking
CREATE TABLE pregnancies (
    pregnancy_id TEXT PRIMARY KEY,
    household_id TEXT REFERENCES households(household_id),
    woman_name TEXT,
    age INTEGER,
    parity INTEGER,
    gravida INTEGER,
    lmp_date DATE,
    edd_date DATE,
    prior_stillbirths INTEGER DEFAULT 0,
    prior_csections INTEGER DEFAULT 0,
    prior_pph INTEGER DEFAULT 0,
    hiv_status TEXT,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    hemoglobin REAL,
    danger_signs TEXT, -- JSON array
    risk_score REAL, -- AI-generated, 1-10
    risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
    next_visit_date DATE,
    referral_needed BOOLEAN DEFAULT FALSE,
    referral_facility_id TEXT,
    referral_status TEXT, -- 'pending', 'completed', 'lost_to_followup'
    last_updated TIMESTAMP
);

-- Child Health Tracking
CREATE TABLE children (
    child_id TEXT PRIMARY KEY,
    household_id TEXT REFERENCES households(household_id),
    child_name TEXT,
    dob DATE,
    sex TEXT,
    birth_weight_kg REAL,
    vaccination_status TEXT, -- JSON
    muac REAL, -- mid-upper arm circumference
    weight_kg REAL,
    height_cm REAL,
    danger_signs TEXT, -- JSON array
    symptoms TEXT, -- JSON array
    risk_score REAL,
    iccm_category TEXT, -- 'uncomplicated', 'severe', 'referral'
    treatment_given TEXT,
    referral_needed BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP
);

#### 3.1.2 Edge ML Model: Risk Scoring

Input Features (on-device):
- Maternal: age, parity, gravida, prior obstetric history, danger signs, BP, hemoglobin, distance to facility, food security, season
- Child: age, MUAC, weight-for-height z-score, symptoms, danger signs, vaccination status, season

Model Architecture:
- Primary: Gradient-boosted tree (XGBoost/LightGBM) converted to ONNX/TensorFlow Lite
- Size target: <5MB model file, <100ms inference on Snapdragon 680-class CPU
- Output: Risk score (1-10) + risk category + top 3 contributing factors (explainability)

Explainability Requirement:
Every risk score must display the top 3 factors driving the score (e.g., "High risk due to: 1) Third-trimester + no prior ANC, 2) BP 150/95, 3) 12km from nearest facility").

#### 3.1.3 CHW App Screens

1. **Login:** Biometric or PIN (no internet required)
2. **Daily Dashboard:**
   - Today's prioritized visit list (ranked by risk + urgency)
   - Overdue visits (red badge)
   - New alerts (e.g., "3 high-risk pregnancies in your catchment")
3. **Household Profile:**
   - Family tree view
   - Pregnancy/child cards with risk scores (color-coded: green/yellow/red)
   - GPS map showing facility locations
4. **Visit Form:**
   - Dynamic form based on risk profile (high-risk = more detailed questions)
   - Danger sign checklist with AI-assisted severity flagging
   - iCCM decision support: "Based on symptoms, this child may have severe malaria. Refer immediately to [Facility Name]."
   - Override button: "I disagree with AI recommendation" (logged for model improvement)
5. **Referral Form:**
   - Auto-populated from visit data
   - Facility recommendation with real-time stock status (if connectivity available)
   - SMS notification to receiving facility
   - Referral tracking: "Did patient arrive?" follow-up prompt after 48 hours

### 3.2 ULALO-AI: Predictive Surveillance & Outbreak Detection

#### 3.2.1 Data Ingestion Pipeline

Pseudocode for ULALO-AI data pipeline:

class SurveillanceDataPipeline:
    def __init__(self):
        self.dhis2_client = DHIS2Client(base_url, credentials)
        self.climate_client = ClimateDataClient()
        self.warehouse = DataWarehouse()

    def weekly_ingestion(self):
        # Pull DHIS2 weekly epidemiological data
        malaria_cases = self.dhis2_client.get_data(
            data_elements=['malaria_confirmed', 'malaria_suspected', 'severe_malaria_admissions'],
            org_units=['Nsanje', 'Neno', 'Blantyre'],
            periods='2020W01-2026W52'
        )

        # Pull climate data
        climate = self.climate_client.get_data(
            variables=['rainfall_mm', 'temperature_c', 'humidity_pct'],
            regions=['Nsanje_TA_list', 'Neno_TA_list', 'Blantyre_TA_list'],
            periods='2020-01-01_to_2026-12-31'
        )

        # Merge and store
        merged = self.merge_spatial_temporal(malaria_cases, climate)
        self.warehouse.store(merged, table='surveillance_climate_integrated')

    def generate_alerts(self, prediction_horizon_weeks=2):
        model = self.load_model('malaria_outbreak_predictor_v{latest}')
        latest_data = self.warehouse.get_latest(window_weeks=8)
        predictions = model.predict(latest_data, horizon=prediction_horizon_weeks)

        for ta in predictions:
            if ta.risk_score > 7.0:
                alert = OutbreakAlert(
                    district=ta.district,
                    ta_name=ta.ta_name,
                    predicted_cases=ta.predicted_cases,
                    confidence_interval=ta.ci_95,
                    recommended_actions=ta.recommended_actions,
                    generated_at=datetime.now()
                )
                alert.send_to_dho()
                alert.send_to_drtt()
                alert.log_to_dhis2()

#### 3.2.2 Predictive Models

Malaria Outbreak Model:
- Outcome: Binary (outbreak = weekly confirmed cases > 90th percentile for that epidemiological week, adjusted for population)
- Horizon: 2-week and 4-week predictions
- Features:
  - Lagged case counts (1, 2, 4, 8 weeks)
  - Lagged rainfall (cumulative 2-week, 4-week, intensity)
  - Temperature and humidity (1, 2, 4-week lags)
  - Seasonal indicators (month, year)
  - Population density by TA
  - Flood events (binary, 0-4 week lag)
- Models:
  - Baseline: Seasonal ARIMA with climate exogenous variables
  - Primary: XGBoost with time-series cross-validation
  - Exploratory: LSTM (if data volume supports)
- Validation: Rolling-origin time-series CV. Train 2019-2023, validate 2024-2025, test prospective 2026.
- Metrics: Sensitivity, specificity, PPV, NPV, AUC-ROC, calibration (Brier score)

Cholera Risk Model:
- Outcome: Binary (cholera outbreak in district within 4 weeks)
- Features: Rainfall intensity, flood extent, sanitation coverage, historical outbreak geospatial patterns, population displacement
- Model: Logistic regression (interpretable for DHOs) + XGBoost ensemble

Measles Immunity Gap Model:
- Outcome: Binary (measles outbreak risk in TA within 8 weeks)
- Features: Vaccination coverage (MCV1, MCV2), population movement patterns, case clustering, population density
- Model: Spatial scan statistics (SaTScan) + gradient boosting

#### 3.2.3 Alert Protocol

Pre-calibrated alert thresholds co-designed with Nsanje DHO:

GREEN (risk_score <= 3.0):
  - Continue routine surveillance
  - Ensure RDT/ACT stock at standard levels

YELLOW (risk_score <= 6.0):
  - Enhance community mobilization in predicted TAs
  - Pre-position 2-week buffer stock of RDTs and ACTs at health centres
  - Activate CHW early warning networks

RED (risk_score > 6.0):
  - Activate District Rapid Response Team
  - Deploy mobile outreach teams to predicted TAs
  - Request emergency commodity buffer from Central Medical Stores
  - Alert neighbouring districts
  - Consider temporary treatment posts in high-risk villages

#### 3.2.4 DHO Dashboard

Screens:
1. **Alert Inbox:** List of active alerts with risk scores, predicted TAs, and recommended actions
2. **Risk Map:** Interactive map showing TA-level risk scores (green/yellow/red heatmap) with facility locations
3. **Trend Analysis:** Time-series charts of actual vs. predicted cases, model accuracy over time
4. **Response Tracker:** Log of DRRT actions taken in response to alerts, with outcome tracking
5. **Model Performance:** Real-time accuracy metrics, calibration plots, recent prediction errors

### 3.3 CHUMA-AI: Supply Chain & Referral Intelligence

#### 3.3.1 Stockout Prediction Model

Data Sources:
- LMIS: Monthly consumption data, stock on hand, stockouts, lead times, order quantities
- DHIS2: Patient visit volumes, disease burden, seasonal patterns
- ULALO-AI: Predicted outbreak signals (increased demand forecast)

Model:
- Outcome: Binary (stockout of essential medicine within 4-6 weeks)
- Features:
  - Current stock on hand / average monthly consumption (months of supply)
  - Consumption trend (3-month rolling average)
  - Lead time variability
  - Seasonal demand patterns
  - Predicted outbreak demand (from ULALO-AI)
  - Order pipeline status
- Architecture: XGBoost for binary classification + ARIMA for demand forecasting
- Output: Stockout probability + recommended order quantity + recommended order date

#### 3.3.2 Smart Referral Optimization

Algorithm: Multi-criteria decision analysis (MCDA)

Criteria & Weights (co-designed with clinicians):
- Distance to facility (weight: 0.25)
- Current stock of required medicine (weight: 0.30)
- Staffing level / bed availability (weight: 0.20)
- Historical quality of care score (weight: 0.15)
- Transport accessibility (weight: 0.10)

Output: Ranked list of 3 recommended facilities with scores and rationale.

#### 3.3.3 Ministerial Dashboard

Screens:
1. **National Overview:** Map of all 28 districts with color-coded performance on key indicators
2. **Resource Forecasting:** 3-6 month projections of commodity needs, staffing gaps, and budget requirements by district
3. **Budget Scenario Modeling:** Interactive tool: "If we reallocate X million MWK to malaria commodities in District Y, what is the projected impact on stockouts and case fatality?"
4. **Policy Target Tracker:** Real-time progress on National Health Policy targets (e.g., "Facilities delivering essential services: 54% -> 100% by 2030")
5. **NLG Executive Summary:** Auto-generated weekly brief in plain English: "This week, 3 districts are predicted to experience malaria outbreaks. Nsanje requires emergency ACT resupply. Maternal mortality in Neno has decreased 12% since CHW AI deployment."

### 3.4 SAMALA-AI: Knowledge Translation & Self-Care

**Full specification:** `docs/SAMALA_AI_Technical_Spec.md`

SAMALA-AI is the fourth engine — the namesake. Where the other three engines collect, predict, and optimize, SAMALA translates. It takes existing research and makes it reach the communities it was conducted on. It maintains a self-care library for CHWs. "Kuzisamala" — to take care of yourself.

#### 3.4.1 Core Functions

1. **Research Ingestion:** PubMed, AJOL, WHO IRIS, local university repositories. Studies are anchored to geographic locations (district/TA/facility). Researcher consent required before translation.
2. **Knowledge Synthesis:** LLM-powered extraction of key findings, actionable takeaways, and plain-language summaries. Dual-language output (English + Chichewa).
3. **Asset Factory:** Generates communication assets from synthesized content — CHW briefs, videos, audio narrations, posters, flipbooks, SMS templates, community health talks.
4. **Self-Care Library:** Structured health guides (what to do, what not to do, when to seek help) with severity levels. CHWs use these during home visits. The app surfaces relevant guides based on MAMA-AI risk assessment.
5. **Deployment & Impact:** Tracks which assets were delivered where, by whom, and measures knowledge change (pre/post scores) and behavior change.

#### 3.4.2 Data Model

Five new tables (see `docs/SAMALA_AI_Technical_Spec.md` for full SQL):
- `research_studies` — ingested research anchored to geography
- `knowledge_assets` — synthesized communication assets (typed, bilingual)
- `knowledge_deployments` — delivery records with impact measurement
- `self_care_guides` — structured health guides with severity levels
- `community_health_talks` — 15-minute group session templates

#### 3.4.3 API

All routes under `/api/v1/samala/`:
- `GET/POST /studies` — research inventory
- `PATCH /studies/{id}/consent` — researcher consent workflow
- `GET/POST /assets` — knowledge asset library
- `PATCH /assets/{id}/approve` — quality gate
- `GET/POST /deployments` — delivery tracking
- `PATCH /deployments/{id}/impact` — impact reporting
- `GET/POST /guides` — self-care guide library
- `GET/POST /talks` — community health talk templates
- `GET /summary` — dashboard aggregates

#### 3.4.4 Engine Integrations

- **MAMA-AI → SAMALA:** High-risk visit triggers relevant self-care guide in CHW app response
- **ULALO-AI → SAMALA:** Outbreak alert triggers automatic surfacing of prevention assets for affected TAs
- **CHUMA-AI → SAMALA:** Budget modeling includes knowledge translation costs (printing, training, deployment)
- **DHIS2 ← SAMALA:** Knowledge uptake indicators pushed as custom data elements

#### 3.4.5 Frontend

- **SAMALA Dashboard** (`/samala`): DHO/MoHP view — research inventory, asset library, deployment map, impact metrics
- **Self-Care Library** (`/samala/guides`): CHW-facing guide browser — category grid, severity badges, full bilingual content with audio playback
- **Sidebar:** "Kuzisamala" navigation link

---

## 4. DATA SECURITY & PRIVACY

### 4.1 Encryption
- At rest: AES-256 for all databases, file storage, and backups
- In transit: TLS 1.3 for all API communications
- On device: SQLCipher (AES-256) for local SQLite databases

### 4.2 De-identification
- All patient identifiers (names, phone numbers, exact GPS) remain on-device only
- Synced data uses pseudonymized household IDs and aggregated GPS (TA-level, not household-level)
- Cloud analytics use only aggregated, de-identified data

### 4.3 Access Control
- Role-based access control (RBAC): CHW, Supervisor, DHO, PHIM, MoHP
- Multi-factor authentication for dashboard access
- Audit logging: every data access, model prediction, and alert action is logged with user ID and timestamp

### 4.4 Compliance
- Malawi Data Protection Act (2021)
- WHO guidance on AI in health (2021)
- NHSRC ethical approval for all research components

---

## 5. DEVELOPMENT PHASES

### Phase 1: Foundation (Months 1-3)
- [ ] Set up development environment (Docker, CI/CD, staging environment)
- [ ] Build DHIS2/iCHIS/LMIS API adapters
- [ ] Implement local SQLite schema and encrypted storage
- [ ] Build basic CHW app shell (login, household registry, offline sync)
- [ ] Set up cloud infrastructure (VPC, databases, API gateway)
- [ ] Implement data ingestion pipeline for historical DHIS2 + climate data

### Phase 2: MAMA-AI MVP (Months 4-6)
- [ ] Build pregnancy and child health data models
- [ ] Train initial risk scoring model on historical data
- [ ] Convert model to TensorFlow Lite and deploy on test devices
- [ ] Build CHW app screens: dashboard, visit form, referral form
- [ ] Implement explainability feature (top 3 risk factors)
- [ ] Pilot with 20 CHWs in one TA for UX testing

### Phase 3: ULALO-AI MVP (Months 5-8)
- [ ] Build climate data ingestion pipeline
- [ ] Train malaria outbreak prediction model
- [ ] Build alert generation and distribution system
- [ ] Build DHO dashboard (alert inbox, risk map, trend analysis)
- [ ] Integrate with DHIS2 for alert logging
- [ ] Pilot with Nsanje DHO during 2026-2027 rainy season

### Phase 4: CHUMA-AI MVP (Months 7-10)
- [ ] Build LMIS data ingestion pipeline
- [ ] Train stockout prediction model
- [ ] Build referral optimization algorithm
- [ ] Build Ministerial dashboard (resource forecasting, budget modeling, NLG)
- [ ] Integrate ULALO-AI demand signals into supply chain predictions

### Phase 5: Integration & Pilot (Months 10-15)
- [ ] End-to-end integration testing
- [ ] Security audit and penetration testing
- [ ] Scale CHW deployment to 150 per district (450 total)
- [ ] Deploy DHO dashboards to all 3 pilot districts
- [ ] Launch Ministerial dashboard at MoHP
- [ ] Begin MEL data collection

### Phase 6: Refinement & Scale Prep (Months 16-24)
- [ ] Model retraining based on pilot feedback
- [ ] UX refinement based on CHW and DHO feedback
- [ ] Performance optimization (battery, bandwidth, storage)
- [ ] Develop national scale-up plan
- [ ] Train PHIM data scientists for handover
- [ ] Government transition and budget integration

### Phase 7: SAMALA-AI MVP (Months 10-16, parallel to Phase 5-6)
- [ ] Build `research_studies`, `knowledge_assets`, `self_care_guides`, `community_health_talks`, `knowledge_deployments` data model (see `docs/SAMALA_AI_Technical_Spec.md`)
- [ ] Ship Standing Self-Care Pathway first: curated guides + MAMA-AI risk-category trigger hook + CHW app Knowledge Library screen (MVP step 1, spec §7)
- [ ] Build MoHP/PHIM/DHO research intake form and researcher-consent workflow
- [ ] Run one Research Translation Pathway program end-to-end by hand to validate the model before generalizing (MVP step 2, spec §7)
- [ ] Wire `knowledge_deployments` reach logging through the existing sync engine from day one
- [ ] Build `/samala` DHO/MoHP dashboard tab and `/samala/guides` CHW-facing library

---

## 6. API SPECIFICATIONS (Draft)

### 6.1 CHW App API

POST /api/v1/visits
  Submit a CHW home visit record
  Request body:
    household_id: string
    chw_id: string
    visit_date: ISO8601
    pregnancy_id: string | null
    child_id: string | null
    symptoms: array[string]
    danger_signs: array[string]
    measurements: object
    ai_recommendation: object
    chw_override: boolean
    chw_notes: string
    gps_lat: float
    gps_lon: float
    photos: array[base64]  # queued for upload
  Response 200:
    visit_id: string
    sync_status: "synced" | "queued"
    next_visit_recommendation: object
  Response 401: Unauthorized
  Response 422: Validation error

GET /api/v1/chw/{chw_id}/priority-list
  Retrieve today's prioritized visit list
  Response 200:
    visits: array[
      {
        household_id: string
        household_name: string
        visit_type: "pregnancy" | "child" | "routine"
        risk_score: float
        risk_category: "low" | "medium" | "high" | "critical"
        due_date: ISO8601
        overdue_days: int
        top_risk_factors: array[string]
        distance_km: float
      }
    ]

POST /api/v1/referrals
  Create a referral
  Request body:
    visit_id: string
    patient_id: string
    referral_reason: string
    urgency: "routine" | "urgent" | "emergency"
    recommended_facilities: array[
      {
        facility_id: string
        facility_name: string
        distance_km: float
        stock_status: object
        score: float
      }
    ]
    selected_facility_id: string
    chw_id: string
  Response 201:
    referral_id: string
    referral_code: string
    estimated_arrival: ISO8601
    facility_notification_status: "sent" | "queued"

### 6.2 DHO Dashboard API

GET /api/v1/district/{district_id}/alerts
  Retrieve active outbreak alerts
  Response 200:
    alerts: array[
      {
        alert_id: string
        disease: "malaria" | "cholera" | "measles" | "diarrhea"
        ta_name: string
        risk_score: float
        alert_level: "green" | "yellow" | "red"
        predicted_cases: int
        confidence_interval: [int, int]
        generated_at: ISO8601
        valid_until: ISO8601
        recommended_actions: array[string]
        response_status: "pending" | "acknowledged" | "in_progress" | "resolved"
        responded_by: string | null
        response_notes: string | null
      }
    ]

POST /api/v1/alerts/{alert_id}/respond
  Log a DRRT response to an alert
  Request body:
    response_status: "acknowledged" | "in_progress" | "resolved"
    actions_taken: array[string]
    resources_deployed: object
    notes: string
    responded_by: string

GET /api/v1/district/{district_id}/surveillance/trends
  Time-series data for dashboard charts
  Response 200:
    actual_cases: array[{week: string, cases: int}]
    predicted_cases: array[{week: string, cases: int, ci_lower: int, ci_upper: int}]
    model_accuracy: {auc_roc: float, sensitivity: float, specificity: float}

### 6.3 Ministerial Dashboard API

GET /api/v1/national/overview
  Response 200:
    districts: array[
      {
        district_id: string
        district_name: string
        malaria_risk_level: "low" | "medium" | "high"
        active_alerts: int
        stockout_count: int
        maternal_mortality_ratio: float
        under5_mortality_rate: float
        essential_service_coverage: float
      }
    ]
    national_summary: object

GET /api/v1/national/forecast?scenario={budget_scenario}
  Budget and resource forecasting
  Response 200:
    forecast_period: [ISO8601, ISO8601]
    commodity_needs: array[
      {
        commodity: string
        district: string
        predicted_consumption: int
        recommended_order: int
        stockout_risk: float
      }
    ]
    budget_scenario: object
    executive_summary: string  # NLG-generated

### 6.4 SAMALA-AI API

Full request/response detail: `docs/SAMALA_AI_Technical_Spec.md` §2. Summary:

GET/POST /api/v1/samala/studies
  Research inventory. POST role: mohp | phim | dho.

PATCH /api/v1/samala/studies/{study_id}/consent
  Researcher consent workflow — gates the discovered -> synthesizing transition.

GET/POST /api/v1/samala/assets
  Knowledge asset library (study-linked or standing self-care content).

PATCH /api/v1/samala/assets/{asset_id}/approve
  Review/approval quality gate — study-linked assets require researcher_reviewed before mohp_approved.

GET/POST /api/v1/samala/guides
GET/POST /api/v1/samala/talks
  Self-care guide and community health talk libraries.

GET/POST /api/v1/samala/deployments
  Delivery tracking, routed through the existing sync engine (not a new ingestion path).

PATCH /api/v1/samala/deployments/{deployment_id}/impact
  Pre/post knowledge-score and outcome-indicator capture.

GET /api/v1/samala/summary
  Dashboard aggregate. District-scoped for dho role — enforce at build time, not as a follow-up fix.

GET /api/v1/chw/{chw_id}/knowledge-library
  Catchment-scoped bundle for offline caching — mirrors GET /chw/{chw_id}/priority-list.

---

## 7. TESTING REQUIREMENTS

### 7.1 Unit Tests
- All API endpoints (pytest + FastAPI TestClient)
- All database models and migrations
- ML model inference (edge + cloud)
- Sync engine conflict resolution

### 7.2 Integration Tests
- End-to-end CHW visit -> risk score -> referral -> facility notification
- DHIS2 data pull -> model training -> alert generation -> DHO dashboard
- Offline scenario: CHW app functions for 7 days without connectivity, then syncs correctly

### 7.3 Performance Tests
- CHW app: <2 second app launch, <100ms risk score inference, <5 second form save
- API: <200ms response time for 95th percentile requests, 1000 concurrent users
- Dashboard: <3 second initial load, <1 second for filtered views

### 7.4 Security Tests
- Penetration testing (OWASP Top 10)
- Data encryption verification
- RBAC access control testing
- API rate limiting and DDoS resilience

### 7.5 Usability Tests
- CHW task completion rate >90% for core workflows
- DHO alert response time <5 minutes from notification to action
- Ministerial dashboard: non-technical user can generate executive summary without training

---

## 8. DEPLOYMENT & OPERATIONS

### 8.1 Environments
- **Development:** Local Docker, developer laptops
- **Staging:** Cloud instance, synthetic data, automated CI/CD deployment
- **Pilot:** Cloud instance, real DHIS2 test environment, 20 CHWs, 1 district
- **Production:** Cloud instance, live DHIS2, 450 CHWs, 3 districts, MoHP dashboard

### 8.2 Monitoring
- Application performance: Datadog / New Relic / AWS CloudWatch
- Error tracking: Sentry
- ML model drift: Automated monitoring of prediction accuracy vs. actuals; alert if AUC-ROC drops below 0.70
- Infrastructure: Prometheus + Grafana for server metrics

### 8.3 Backup & Recovery
- Daily automated backups of PostgreSQL to S3 Glacier
- Weekly full system snapshots
- Disaster recovery plan: RTO <4 hours, RPO <24 hours

### 8.4 Support
- Level 1: CHW peer support network (WhatsApp groups)
- Level 2: District IT focal persons (trained by project)
- Level 3: VillageReach technical support desk (business hours)
- Level 4: Engineering team (escalations, bug fixes)

---

## 9. DOCUMENTATION REQUIREMENTS

- **API Documentation:** OpenAPI (Swagger) spec, auto-generated
- **CHW Training Manual:** Illustrated, Chichewa + English, printable PDF
- **DHO Dashboard User Guide:** Video tutorials + written SOPs
- **Ministerial Dashboard Briefing Deck:** 10-slide overview for policymakers
- **Technical Architecture Document:** For PHIM handover and scale-up
- **Model Cards:** For each ML model (training data, performance, limitations, bias audit results)
- **Ethics & Governance Framework:** For regulatory compliance and public accountability

---

## 10. ACCEPTANCE CRITERIA

The platform is considered "production ready" when:

1. **MAMA-AI:** 450 CHWs can complete a full home visit (registration -> assessment -> risk score -> referral) in <10 minutes, with 100% offline functionality.
2. **ULALO-AI:** Model achieves AUC-ROC >=0.75 for 2-week malaria outbreak prediction on prospective validation data.
3. **CHUMA-AI:** Stockout prediction accuracy >=70% (PPV) at 4-week horizon; referral optimization reduces "wrong facility" referrals by >=30%.
4. **SAMALA-AI:** ≥80% of Malawi-relevant health research synthesized within 30 days; self-care library covers top 20 causes of morbidity; CHW app Kuzisamala section works offline after initial sync; ≥50% of pilot households receive ≥1 knowledge asset per quarter; knowledge retention (post-test) ≥60%.
5. **Security:** Passes independent penetration test with no critical vulnerabilities.
6. **Privacy:** All patient data encrypted; no identifiable data in cloud analytics; compliance audit passed.
7. **Usability:** CHW task completion rate >=90%; DHO alert response rate >=80% within 24 hours.
8. **Integration:** Bidirectional sync with DHIS2 and iCHIS functioning with <1% data loss.
9. **Policy:** Ministerial dashboard adopted by MoHP for at least one budget planning cycle.

---

## 11. OPEN-SOURCE COMMITMENT

All non-proprietary code will be released under the **MIT License** in a public GitHub repository:
- zisamale-android: CHW mobile app
- zisamale-api: Cloud services and API
- zisamale-ml: Model training pipelines and notebooks
- zisamale-dashboards: Web dashboard code
- zisamale-docs: All documentation and training materials

**Exception:** Proprietary data (DHIS2 exports, patient records) will never be open-sourced. Model weights trained on proprietary data will be released as artifacts with appropriate licensing.

---

## 12. HANDOFF CHECKLIST (For PHIM Transition, Month 24)

- [ ] All source code transferred to PHIM GitHub organization
- [ ] All cloud infrastructure documented with architecture diagrams
- [ ] All API credentials rotated and transferred to PHIM-controlled accounts
- [ ] All databases migrated to PHIM-managed instances
- [ ] All ML models retrained by PHIM data scientists with project mentorship
- [ ] All documentation complete and reviewed
- [ ] All training materials delivered and trainers trained
- [ ] All support desk protocols transferred
- [ ] All monitoring and alerting dashboards transferred
- [ ] Final security audit passed
- [ ] MoHP sign-off on transition completion
- [ ] 6-month post-transition support agreement in place

---

**END OF TECHNICAL DEVELOPMENT PROMPT**

**Next Steps for Engineering Team:**
1. Review architecture and raise questions
2. Set up local development environment (Docker, Android Studio, Python)
3. Begin Phase 1: Foundation (API adapters, local DB schema, cloud infra)
4. Weekly sprint planning with product owner and clinical advisors
