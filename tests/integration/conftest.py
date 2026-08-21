"""Shared fixtures for Zisamale integration tests.

These tests are fully self-contained: no PostgreSQL, Redis, RabbitMQ or DHIS2
instance is required. The SQLAlchemy async session used by the API is replaced
with an in-memory fake that supports the subset of behaviour the routers rely
on (select/where/order_by, add/flush/commit/rollback), so end-to-end flows can
be exercised through the real FastAPI app via httpx's ASGI transport.
"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

import pytest
import pytest_asyncio

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVICES_API = PROJECT_ROOT / "services" / "api"

for path in (str(SERVICES_API), str(Path(__file__).resolve().parent)):
    if path not in sys.path:
        sys.path.insert(0, path)

from sqlalchemy.sql import operators  # noqa: E402
from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList  # noqa: E402

from app import database as app_database  # noqa: E402
from app.auth import create_access_token  # noqa: E402


# ---------------------------------------------------------------------------
# In-memory fake database
# ---------------------------------------------------------------------------
def _column_name(expr) -> str | None:
    name = getattr(expr, "name", None)
    if not name:
        name = getattr(expr, "key", None)
    return name


def _eval_clause(clause, row) -> bool:
    """Evaluate a simple SQLAlchemy where-clause against a plain ORM row."""
    if clause is None:
        return True
    if isinstance(clause, BooleanClauseList):
        results = [_eval_clause(c, row) for c in clause]
        if clause.operator is operators.or_:
            return any(results)
        return all(results)
    if isinstance(clause, BinaryExpression):
        left_value = getattr(row, _column_name(clause.left) or "", None)
        right_value = getattr(clause.right, "value", None)
        op = clause.operator
        if op is operators.eq:
            return left_value == right_value
        if op is operators.ne:
            return left_value != right_value
        if op is operators.gt:
            return left_value is not None and right_value is not None and left_value > right_value
        if op is operators.ge:
            return left_value is not None and right_value is not None and left_value >= right_value
        if op is operators.lt:
            return left_value is not None and right_value is not None and left_value < right_value
        if op is operators.le:
            return left_value is not None and right_value is not None and left_value <= right_value
        return True
    return True


class FakeResult:
    def __init__(self, rows: list):
        self._rows = list(rows)

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list:
        return list(self._rows)

    def first(self):
        return self._rows[0] if self._rows else None

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class FakeAsyncSession:
    """Minimal stand-in for sqlalchemy.ext.asyncio.AsyncSession."""

    def __init__(self, db: "FakeDatabase"):
        self._db = db
        self._pending: list = []

    async def execute(self, statement) -> FakeResult:
        entity = statement.column_descriptions[0]["entity"]
        rows = [r for r in self._db.tables.get(entity, []) if _eval_clause(statement.whereclause, r)]
        for clause in reversed(list(getattr(statement, "_order_by_clauses", []) or [])):
            column = getattr(clause, "element", clause)
            name = _column_name(column) or ""
            reverse = bool(getattr(clause, "is_descending", False))
            rows.sort(key=lambda r: (getattr(r, name, None) is None, getattr(r, name, None)), reverse=reverse)
        return FakeResult(rows)

    def add(self, obj) -> None:
        self._pending.append(obj)

    def add_all(self, objs) -> None:
        self._pending.extend(objs)

    async def flush(self) -> None:
        for obj in self._pending:
            self._db.tables.setdefault(type(obj), []).append(obj)
        self._pending.clear()

    async def commit(self) -> None:
        await self.flush()

    async def rollback(self) -> None:
        self._pending.clear()


class _SessionContext:
    def __init__(self, db: "FakeDatabase"):
        self.session = FakeAsyncSession(db)

    async def __aenter__(self) -> FakeAsyncSession:
        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        if exc_type is None:
            await self.session.commit()
        else:
            await self.session.rollback()
        return False


class FakeDatabase:
    """Entity-keyed in-memory store shared by every request in a test."""

    def __init__(self):
        self.tables: dict[type, list] = {}

    def seed(self, *objects) -> None:
        for obj in objects:
            self.tables.setdefault(type(obj), []).append(obj)

    def rows(self, model) -> list:
        return list(self.tables.get(model, []))

    def count(self, model) -> int:
        return len(self.rows(model))

    def session_factory(self) -> _SessionContext:
        return _SessionContext(self)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
class _UnreachableEngine:
    """Engine stand-in whose connections fail instantly (no network I/O)."""

    def connect(self):
        raise RuntimeError("database unreachable in tests")


@pytest.fixture()
def fake_db():
    """Patch the application-wide async_session with an in-memory store."""
    db = FakeDatabase()
    with mock.patch.object(app_database, "async_session", db.session_factory), mock.patch.object(
        app_database, "redis_client", None
    ), mock.patch.object(app_database, "engine", _UnreachableEngine()):
        yield db


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
async def client(fake_db):
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
            {"sub": user_id or f"user-{role}-{uuid.uuid4().hex[:8]}", "role": role}
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.fixture()
def now_utc():
    return datetime.now(timezone.utc)
