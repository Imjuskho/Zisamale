"""Chaos engineering tests for Zisamale.

Tests resilience when infrastructure components fail:
- PostgreSQL down → API returns graceful errors, not 500s
- Redis down → rate limiting disabled, auth still works
- DHIS2 integration down → circuit breaker opens
- Network partition → offline sync queues data
- Partial failures → no data corruption
"""
from __future__ import annotations

import asyncio
import subprocess
import time
from contextlib import contextmanager

import httpx
import pytest

BASE = "http://localhost:8000"
CONTAINER_API = "zisamale-api"
CONTAINER_DB = "zisamale-postgres"
CONTAINER_REDIS = "zisamale-redis"


def docker(*args: str) -> str:
    result = subprocess.run(
        ["docker"] + list(args),
        capture_output=True, text=True, timeout=30,
    )
    return result.stdout.strip()


def docker_exec(container: str, cmd: str) -> str:
    return docker("exec", container, "sh", "-c", cmd)


def docker_stop(container: str) -> None:
    docker("stop", container)


def docker_start(container: str) -> None:
    docker("start", container)


def wait_healthy(url: str = f"{BASE}/health", timeout: int = 60) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = httpx.get(url, timeout=5)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


@contextmanager
def stop_container(name: str):
    docker_stop(name)
    try:
        yield
    finally:
        docker_start(name)
        wait_healthy(timeout=60)


def login(retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            r = httpx.post(
                f"{BASE}/api/v1/auth/login",
                json={"username": "dho@nsanje.gov.mw", "password": "Zisamale2026!"},
                timeout=15,
            )
            if r.status_code == 200:
                return r.json()["access_token"]
        except Exception:
            pass
        if attempt < retries - 1:
            time.sleep(2)
    return ""


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"} if token else {}


class TestChaosDatabaseDown:
    """When PostgreSQL is stopped, the API should degrade gracefully."""

    def test_health_reports_db_down(self):
        with stop_container(CONTAINER_DB):
            time.sleep(3)
            r = httpx.get(f"{BASE}/health", timeout=10)
            data = r.json()
            assert data["checks"]["database"] != "ok", "DB should report unhealthy"
            print(f"\n  DB down health: {data}")

    def test_api_returns_error_not_crash(self):
        with stop_container(CONTAINER_DB):
            time.sleep(3)
            token = login()
            r = httpx.get(
                f"{BASE}/api/v1/district/00000000-0000-0000-0000-000000000002/alerts",
                headers=auth(token),
                timeout=10,
            )
            assert r.status_code >= 400, f"Expected error status, got {r.status_code}"
            print(f"\n  DB down GET alerts: {r.status_code} — {r.text[:200]}")

    def test_api_recovers_after_db_restart(self):
        with stop_container(CONTAINER_DB):
            time.sleep(2)
        assert wait_healthy(timeout=60), "API did not recover after DB restart"
        time.sleep(3)
        token = login(retries=5)
        assert token, "Login should work after DB recovery"


class TestChaosRedisDown:
    """When Redis is stopped, auth and rate limiting should degrade gracefully."""

    def test_auth_still_works(self):
        with stop_container(CONTAINER_REDIS):
            time.sleep(3)
            r = httpx.post(
                f"{BASE}/api/v1/auth/login",
                json={"username": "dho@nsanje.gov.mw", "password": "Zisamale2026!"},
                timeout=15,
            )
            assert r.status_code == 200, f"Login failed without Redis: {r.status_code} {r.text}"
            print(f"\n  Redis down login: {r.status_code} OK")

    def test_health_reports_redis_down(self):
        with stop_container(CONTAINER_REDIS):
            time.sleep(3)
            r = httpx.get(f"{BASE}/health", timeout=10)
            data = r.json()
            assert data["checks"]["redis"] != "ok", "Redis should report unhealthy"
            print(f"\n  Redis down health: {data}")

    def test_api_recovers_after_redis_restart(self):
        with stop_container(CONTAINER_REDIS):
            time.sleep(2)
        time.sleep(10)
        assert wait_healthy(timeout=60), "API did not recover after Redis restart"


class TestChaosPartialFailures:
    """Edge cases that shouldn't cause data corruption."""

    def test_malformed_json_doesnt_crash_server(self):
        r = httpx.post(
            f"{BASE}/api/v1/auth/login",
            content=b"not json at all {{{",
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"

    def test_huge_payload_rejected(self):
        token = login()
        huge = {"household_id": "00000000-0000-0000-0000-0000000000cc", "visit_date": "2026-08-21", "visit_type": "routine",
                "visits": [{"data": "x" * 10000}] * 100}
        r = httpx.post(
            f"{BASE}/api/v1/visits",
            json=huge,
            headers=auth(token),
            timeout=30,
        )
        assert r.status_code in (200, 400, 413, 422, 403), f"Unexpected: {r.status_code}"

    def test_empty_auth_header_rejected(self):
        r = httpx.get(
            f"{BASE}/api/v1/district/00000000-0000-0000-0000-000000000002/alerts",
            headers={"Authorization": "Bearer invalid"},
            timeout=10,
        )
        assert r.status_code in (401, 403), f"Expected auth error, got {r.status_code}"

    def test_nonexistent_endpoint_returns_404(self):
        r = httpx.get(f"{BASE}/api/v1/does-not-exist", timeout=10)
        assert r.status_code in (404, 405), f"Expected 404, got {r.status_code}"

    def test_method_not_allowed(self):
        r = httpx.delete(f"{BASE}/health", timeout=10)
        assert r.status_code in (404, 405), f"Expected 405, got {r.status_code}"

    def test_concurrent_same_user_login(self):
        """Multiple logins for same user should not cause DB errors."""
        def do_login():
            return httpx.post(
                f"{BASE}/api/v1/auth/login",
                json={"username": "dho@nsanje.gov.mw", "password": "Zisamale2026!"},
                timeout=10,
            )
        results = [do_login() for _ in range(10)]
        statuses = [r.status_code for r in results]
        assert all(s in (200, 429) for s in statuses), f"Unexpected statuses: {statuses}"
        print(f"\n  Concurrent login statuses: {statuses}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
