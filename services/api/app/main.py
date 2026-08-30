"""Zisamale Cloud API - Main Application."""

from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ratelimit import RateLimitMiddleware
from app.audit import AuditLogMiddleware
from app.routers import alerts, auth, national, referrals, uploads, visits
from app.routers import chw_sync, map_layers, demo_seeder, export_routes, facilities, households, integrations, ml_predictions, surveillance, websocket_routes
from app.routers import pregnancies, children
from app.routers import registry
from app.routers import knowledge
from app.routers import public


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation
    if settings.environment == "production" and not settings.secret_key:
        raise RuntimeError(
            "SECRET_KEY must be set via environment variable in production. "
            "Refusing to start with empty secret key."
        )
    app.state.start_time = time.time()
    yield
    # Shutdown — close connection pools
    try:
        from app.database import engine, redis_client
        await engine.dispose()
        if redis_client:
            await redis_client.aclose()
    except Exception:
        pass


app = FastAPI(
    title="Zisamale API",
    description="AI-augmented community health intelligence platform for Malawi",
    version="0.2.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list_validated,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditLogMiddleware)
app.add_middleware(RateLimitMiddleware)

# Core routers
app.include_router(auth.router)
app.include_router(visits.router)
app.include_router(referrals.router)
app.include_router(alerts.router)
app.include_router(national.router)
app.include_router(surveillance.router)

# New routers
app.include_router(uploads.router)
app.include_router(export_routes.router)
app.include_router(facilities.router)
app.include_router(chw_sync.router)
app.include_router(households.router)
app.include_router(map_layers.router)
app.include_router(demo_seeder.router)
app.include_router(ml_predictions.router)
app.include_router(websocket_routes.router)
app.include_router(integrations.router)
app.include_router(pregnancies.router)
app.include_router(children.router)
app.include_router(registry.router)
app.include_router(knowledge.router)
app.include_router(public.router)


@app.get("/health")
async def health_check(response: Response):
    checks = {"api": "ok", "database": "unknown", "redis": "unknown"}

    try:
        from app.database import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {type(e).__name__}"

    try:
        from app.database import redis_client
        if redis_client:
            await redis_client.ping()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "not_configured"
    except Exception as e:
        checks["redis"] = f"error: {type(e).__name__}"

    uptime = time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0
    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503
    response.status_code = status_code
    return {
        "status": "healthy" if all_ok else "degraded",
        "version": "0.2.0",
        "environment": settings.environment,
        "uptime_seconds": round(uptime, 1),
        "checks": checks,
    }


@app.get("/")
async def root():
    return {
        "name": "Zisamale API",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
        "websocket": "/ws/alerts",
    }
