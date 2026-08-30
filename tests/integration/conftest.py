"""Shared fixtures for Zisamale integration tests.

These tests run against a real PostgreSQL instance (``zisamale_test``), because
the in-memory fake silently masked contract bugs (bad UUIDs, missing operator
support, raw SQL aggregates). Test URLs derive from ``settings.database_url``
but always target a ``*_test`` database so the development DB is never touched.

Isolation: every test executes inside a single transaction that is rolled back
at teardown, so the schema is recreated once per test but each test sees a
clean, fast, fully isolated database.
"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVICES_API = PROJECT_ROOT / "services" / "api"

for path in (str(SERVICES_API),):
    if path not in sys.path:
        sys.path.insert(0, path)

from app import database as app_database  # noqa: E402
from app.auth import create_access_token  # noqa: E402
from app.config import settings  # noqa: E402


def _test_database_url() -> str:
    """Never run integration tests against the shared development database."""
    url = settings.database_url
    dbname = url.rsplit("/", 1)[-1]
    if dbname.endswith("_test"):
        return url
    # Derive a dedicated test database from the configured connection so the
    # app's own URL (e.g. .../zisamale) is never touched by drop_all.
    return f"{url.rsplit('/', 1)[0]}/zisamale_test"


async def _reset_schema(engine: create_async_engine) -> None:
    import app.models  # noqa: F401  (register every table on Base.metadata)

    from app.database import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


class RealTestDb:
    """Test-facing handle over the live test database.

    ``seed`` persists via its own session (a savepoint on the shared
    connection), so every request session and later reads see it.
    """

    def __init__(self, factory: async_sessionmaker):
        self._factory = factory

    async def seed(self, *objects) -> None:
        async with self._factory() as session:
            session.add_all(objects)
            await session.commit()

    async def rows(self, model) -> list:
        async with self._factory() as session:
            result = await session.execute(select(model))
            return list(result.scalars().all())

    async def count(self, model) -> int:
        async with self._factory() as session:
            result = await session.execute(select(func.count()).select_from(model))
            return int(result.scalar_one())


@pytest_asyncio.fixture()
async def db(monkeypatch):
    """Wire the real test database into the app for one isolated test."""
    from app.database import Base, get_db
    from app.main import app

    engine = create_async_engine(_test_database_url(), pool_pre_ping=True, query_cache_size=0)

    await _reset_schema(engine)

    conn = await engine.connect()
    tx = await conn.begin()
    factory = async_sessionmaker(
        bind=conn,
        class_=AsyncSession,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    monkeypatch.setattr(app_database, "async_session", factory)
    monkeypatch.setattr(app_database, "engine", engine)

    async def _override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    handle = RealTestDb(factory)
    try:
        yield handle
    finally:
        app.dependency_overrides.pop(get_db, None)
        await tx.rollback()
        await conn.close()
        await engine.dispose()


@pytest.fixture(autouse=True)
def _hermetic_auth(monkeypatch):
    """Force real JWT verification regardless of the ENVIRONMENT env var."""
    from app import deps

    monkeypatch.setattr(deps, "TEST_MODE", False)


@pytest.fixture(autouse=True)
def _relax_rate_limits(monkeypatch):
    """Give tests effectively unlimited rate limits unless they opt out."""
    from app.ratelimit import RATE_LIMITS

    for role in list(RATE_LIMITS):
        monkeypatch.setitem(RATE_LIMITS, role, {"requests": 1_000_000, "window_seconds": 60})


@pytest_asyncio.fixture()
async def client(db):
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


@pytest.fixture()
def auth_headers():
    """Factory for Authorization headers carrying a real JWT for a role."""

    def _headers(role: str, user_id: str | None = None) -> dict[str, str]:
        token = create_access_token(
            {"sub": user_id or str(uuid.uuid4()), "role": role}
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.fixture()
def now_utc():
    return datetime.now(timezone.utc)