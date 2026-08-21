-- Zisamale Database Initialization
-- Enables required PostgreSQL extensions

-- PostGIS for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- TimescaleDB for time-series data (install extension when available)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
