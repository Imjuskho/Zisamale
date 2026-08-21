# ADR-002: PostgreSQL with PostGIS over MongoDB

## Status
Accepted

## Context
The platform needs relational data (users, households, pregnancies), geospatial queries (facility proximity, TA-level aggregation), and time-series data (surveillance, climate).

## Decision
Use PostgreSQL 15+ with PostGIS extension. TimescaleDB to be added when available for hypertable optimization of time-series tables.

## Consequences
- **Positive**: Single database for all data types; mature ACID compliance
- **Positive**: PostGIS enables spatial joins (nearest facility, TA-level aggregation)
- **Positive**: JSONB columns for flexible schema (danger signs, vaccination status)
- **Negative**: TimescaleDB not available in base PostGIS Docker image; use standard tables with time indexes for now
