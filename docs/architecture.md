# Zisamale Architecture

## System Overview

Zisamale is an AI-augmented community health intelligence platform for Malawi,
integrating three AI engines into the existing digital health infrastructure.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    EDGE LAYER                        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ MAMA-AI  │  │  ULALO-AI    │  │   CHUMA-AI    │ │
│  │  Mobile  │  │  Symptom     │  │   Referral    │ │
│  │   App    │  │  Reporter    │  │   Initiator   │ │
│  │ (Kotlin) │  │  (Kotlin)    │  │   (Kotlin)    │ │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘ │
│       │               │                  │          │
│  ┌────┴───────────────┴──────────────────┴──────┐   │
│  │         CHT / iCHIS Sync Adapter            │   │
│  │      SQLite (SQLCipher) + SMS Fallback       │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │ Sync (2G/3G, opportunistic)
┌─────────────────────┼───────────────────────────────┐
│                 CLOUD LAYER                         │
│  ┌──────────────────┴──────────────────────────┐   │
│  │            API Gateway (Kong)               │   │
│  │     Rate limiting, OAuth2, Audit trail      │   │
│  └──────┬──────────┬──────────┬────────────────┘   │
│  ┌──────┴───┐ ┌────┴────┐ ┌──┴──────────┐         │
│  │ MAMA-AI  │ │ULALO-AI │ │  CHUMA-AI   │         │
│  │ Cloud    │ │ Cloud   │ │  Cloud      │         │
│  │(FastAPI) │ │(FastAPI)│ │ (FastAPI)   │         │
│  └──────┬───┘ └────┬────┘ └──┬──────────┘         │
│  ┌──────┴──────────┴─────────┴────────────┐        │
│  │         Integration Layer              │        │
│  │  DHIS2 │ iCHIS/CHT │ LMIS │ Climate   │        │
│  └──────────────────┬─────────────────────┘        │
│  ┌──────────────────┴──────────────────────────┐   │
│  │      Data Warehouse (PostgreSQL)            │   │
│  │      + PostGIS + TimescaleDB                │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────┐
│              DASHBOARD LAYER                        │
│  ┌──────────┐  ┌────┴────┐  ┌───────────────┐     │
│  │   DHO    │  │  MoHP   │  │  CHUMA Policy │     │
│  │Dashboard │  │Dashboard│  │  Dashboard    │     │
│  │ (React)  │  │ (React) │  │  (React)      │     │
│  └──────────┘  └─────────┘  └───────────────┘     │
└─────────────────────────────────────────────────────┘
```

## Data Flow

1. **CHW Visit** → On-device risk scoring (TensorLite) → Visit recorded locally
2. **Sync** → Opportunistic upload to cloud when connectivity available
3. **Cloud Processing** → Model retraining, aggregate analytics
4. **Surveillance** → Weekly DHIS2 + climate data ingestion → Outbreak prediction
5. **Alerts** → Push to DHO dashboards → DRRT activation
6. **Supply Chain** → LMIS stock data → Stockout prediction → Reorder recommendations
7. **Dashboards** → Real-time display for decision-makers at all levels

## Security Model

- **At rest**: AES-256 encryption (SQLCipher on device, PostgreSQL TDE in cloud)
- **In transit**: TLS 1.3 for all API communications
- **Auth**: JWT with role-based access (CHW, Supervisor, DHO, PHIM, MoHP)
- **De-identification**: Patient identifiers never leave the device; only aggregated/pseudonymised data synced
- **Audit**: Every data access, prediction, and action logged

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Mobile | Kotlin + Jetpack Compose | Native performance, offline-first, CHT-compatible |
| Edge ML | TensorFlow Lite | On-device inference, <100ms |
| Cloud API | Python + FastAPI | High performance, async, ML integration |
| ML | scikit-learn + XGBoost | Mature, interpretable, well-documented |
| Database | PostgreSQL + PostGIS | Relational, geospatial, time-series |
| Cache | Redis | Session management, alert queuing |
| Dashboard | React + TypeScript | Component-based, type-safe |
| Viz | Recharts + D3.js | Custom charts, interactive maps |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Containers | Docker + Docker Compose | Reproducible environments |

## Deployment Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| Development | Local dev | Docker Compose on laptop |
| Staging | Integration testing | Cloud VM + synthetic data |
| Pilot | Real CHWs, 1 district | Cloud + DHIS2 test env |
| Production | 450 CHWs, 3 districts | Cloud (AWS Cape Town / Azure SA North) |
