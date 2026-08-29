# Zisamale

AI-augmented community health intelligence platform for Malawi.

Zisamale integrates four AI engines — MAMA-AI, ULALO-AI, CHUMA-AI, and SAMALA-AI — into
Malawi's existing digital health infrastructure (DHIS2, iCHIS/CHT, LMIS) to
support 450 Community Health Workers, 3 District Health Offices, 45 health
facilities, and the Ministry of Health. "Kuzisamala" — to take care of yourself —
is the platform's namesake; SAMALA-AI makes that literal by translating existing
research into life-changing action for communities.

## Architecture

```
EDGE LAYER (Android, Offline-First)
  MAMA-AI Mobile App ─── On-device risk scoring, prioritised visits, iCCM decisions
  ULALO-AI Reporter ──── Offline symptom capture, GPS tagging
  CHUMA-AI Referral ──── Facility lookup, referral forms
  SAMALA-AI Knowledge ── Self-care guides, health talk templates, asset library

CLOUD LAYER (Python/FastAPI + PostgreSQL)
  API Gateway ────────── Auth, rate limiting, audit trail
  MAMA-AI Service ────── Model retraining, aggregate analytics
  ULALO-AI Service ───── Time-series forecasting, spatial clustering
  CHUMA-AI Service ───── Demand forecasting, referral optimisation
  SAMALA-AI Service ──── Research ingestion, knowledge synthesis, deployment tracking

DASHBOARD LAYER (React/TypeScript)
  DHO Dashboard ──────── Alert inbox, risk maps, CHW performance
  MoHP Dashboard ─────── National surveillance, policy tracking
  CHUMA Policy Dashboard  Budget forecasting, NLG summaries
  SAMALA Dashboard ───── Research inventory, asset library, impact metrics
```

## Monorepo Structure

```
services/api/         Cloud API (Python / FastAPI)
services/ml/          ML training pipelines (Python)
services/dashboards/  Web dashboards (React / TypeScript)
apps/android/         CHW mobile app (Kotlin / Jetpack Compose)
infra/                Docker configs, database schemas
docs/                 Architecture docs, API specs, ADRs
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 20+
- (Optional) Android Studio for mobile app development

### 1. Start Infrastructure

```bash
cp .env.example .env
docker compose up -d
```

### 2. Run the API

```bash
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### 3. Run the Dashboard

```bash
cd services/dashboards
npm install
npm run dev
```

### 4. Run ML Pipelines

```bash
cd services/ml
pip install -e ".[dev]"
python -m pipelines.risk_scoring.train
```

## Testing

```bash
# API tests
cd services/api && pytest -v

# Dashboard tests
cd services/dashboards && npm test

# ML tests
cd services/ml && pytest -v

# Full stack integration
docker compose -f docker-compose.yml -f docker-compose.test.yml run integration-tests
```

## Target Users

| Role | Count | Access Level |
|------|-------|-------------|
| Community Health Workers (CHWs/HSAs) | 450 | Mobile app |
| District Health Office Staff | 3 offices | DHO Dashboard |
| Health Facilities | 45 | Facility portal |
| Ministry of Health | National | MoHP Dashboard |

## Deployment Environments

- **Development**: Local Docker, developer machines
- **Staging**: Cloud instance, synthetic data, automated CI/CD
- **Pilot**: Cloud instance, real DHIS2 test env, 20 CHWs, 1 district
- **Production**: Cloud instance, live DHIS2, 450 CHWs, 3 districts

## Licence

MIT License — see [LICENCE](LICENCE) for details.

## Contact

VillageReach Malawi — zisamale@villagerreach.org
