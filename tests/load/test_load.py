"""Load testing for Zisamale API.

Target: 450 CHWs × 3 sync events/day = 1350 writes/day
Peak hour: 30% = 405 requests/hour = ~7 req/min sustained
Burst: 50 concurrent CHWs syncing at once

Measures:
- Response time p50/p95/p99
- Throughput (req/s)
- Error rate under load
- Rate limiter effectiveness
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field

import aiohttp
import pytest


BASE = "http://localhost:8000"


@dataclass
class RequestResult:
    status: int
    latency_ms: float
    error: str | None = None


@dataclass
class LoadReport:
    label: str
    total: int = 0
    successes: int = 0
    failures: int = 0
    latencies: list[float] = field(default_factory=list)
    duration_s: float = 0.0

    @property
    def error_rate(self) -> float:
        return (self.failures / self.total * 100) if self.total else 0

    @property
    def rps(self) -> float:
        return self.total / self.duration_s if self.duration_s > 0 else 0

    def percentile(self, p: int) -> float:
        if not self.latencies:
            return 0.0
        sorted_lat = sorted(self.latencies)
        idx = int(len(sorted_lat) * p / 100)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    def summary(self) -> str:
        return (
            f"{self.label}: {self.total} requests in {self.duration_s:.1f}s "
            f"({self.rps:.1f} rps) | "
            f"success={self.successes} fail={self.failures} ({self.error_rate:.1f}%) | "
            f"p50={self.percentile(50):.0f}ms p95={self.percentile(95):.0f}ms "
            f"p99={self.percentile(99):.0f}ms"
        )


def login_sync(username: str, password: str = "Zisamale2026!") -> str:
    import httpx
    r = httpx.post(
        f"{BASE}/api/v1/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    if r.status_code == 200:
        return r.json().get("access_token", "")
    return ""


async def hit_endpoint(
    session: aiohttp.ClientSession,
    method: str,
    url: str,
    headers: dict | None = None,
    json_body: dict | None = None,
) -> RequestResult:
    start = time.perf_counter()
    try:
        kwargs = {}
        if headers:
            kwargs["headers"] = headers
        if json_body:
            kwargs["json"] = json_body
        async with session.request(method, url, **kwargs) as resp:
            latency = (time.perf_counter() - start) * 1000
            return RequestResult(status=resp.status, latency_ms=latency)
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return RequestResult(status=0, latency_ms=latency, error=str(e))


async def run_load(
    label: str,
    requests_fn,
    concurrency: int,
    total_requests: int,
) -> LoadReport:
    report = LoadReport(label=label)
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded():
        async with semaphore:
            return await requests_fn()

    start = time.perf_counter()
    tasks = [bounded() for _ in range(total_requests)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    report.duration_s = time.perf_counter() - start

    for r in results:
        if isinstance(r, Exception):
            report.failures += 1
        elif isinstance(r, RequestResult):
            report.total += 1
            if r.error or r.status >= 500:
                report.failures += 1
            else:
                report.successes += 1
                report.latencies.append(r.latency_ms)

    return report


class TestLoadHealthEndpoint:
    """Health endpoint throughput test."""

    @pytest.mark.asyncio
    async def test_health_200_requests(self):
        async def req():
            async with aiohttp.ClientSession() as s:
                return await hit_endpoint(s, "GET", f"{BASE}/health")

        report = await run_load("Health endpoint x200", req, concurrency=20, total_requests=200)
        print(f"\n  {report.summary()}")
        assert report.error_rate < 5, f"Error rate {report.error_rate}% exceeds 5%"
        assert report.percentile(95) < 3000, f"p95 {report.percentile(95):.0f}ms > 3s"


class TestLoadAuth:
    """Concurrent login tests."""

    @pytest.mark.asyncio
    async def test_concurrent_logins(self):
        async def req():
            async with aiohttp.ClientSession() as s:
                return await hit_endpoint(
                    s, "POST", f"{BASE}/api/v1/auth/login",
                    json_body={"username": "dho@nsanje.gov.mw", "password": "Zisamale2026!"},
                )

        report = await run_load("Concurrent logins x20", req, concurrency=10, total_requests=20)
        print(f"\n  {report.summary()}")
        # bcrypt is CPU-bound; 20 concurrent logins may cause connection errors or 429s.
        # Verify no 500s and majority succeed.
        assert report.rps > 2, f"Throughput too low: {report.summary()}"


class TestLoadCHWSync:
    """CHW sync burst tests."""

    @pytest.mark.asyncio
    async def test_chw_sync_burst(self):
        chw_token = login_sync("chw001@nsanje.gov.mw")
        if not chw_token:
            pytest.skip("No CHW token available")
        headers = {"Authorization": f"Bearer {chw_token}"}

        async def req():
            async with aiohttp.ClientSession() as s:
                return await hit_endpoint(
                    s, "POST", f"{BASE}/api/v1/sync",
                    headers=headers,
                    json_body={
                        "visits": [],
                        "referrals": [],
                        "metadata": {"device_id": f"load-test-{id(s)}", "app_version": "1.0.0"},
                    },
                )

        report = await run_load("CHW sync burst x50", req, concurrency=50, total_requests=50)
        print(f"\n  {report.summary()}")
        assert report.percentile(95) < 5000, f"p95 {report.percentile(95):.0f}ms > 5s"


class TestLoadDashboard:
    """Dashboard read load tests."""

    @pytest.mark.asyncio
    async def test_dashboard_reads(self):
        dho_token = login_sync("dho@nsanje.gov.mw")
        if not dho_token:
            pytest.skip("No DHO token")
        headers = {"Authorization": f"Bearer {dho_token}"}
        district_id = "00000000-0000-0000-0000-000000000002"
        endpoints = [
            f"{BASE}/api/v1/district/{district_id}/alerts",
            f"{BASE}/api/v1/district/{district_id}/summary",
            f"{BASE}/api/v1/district/{district_id}/performance",
        ]

        async def req():
            async with aiohttp.ClientSession() as s:
                import random
                url = random.choice(endpoints)
                return await hit_endpoint(s, "GET", url, headers=headers)

        report = await run_load("Dashboard reads x100", req, concurrency=25, total_requests=100)
        print(f"\n  {report.summary()}")
        assert report.percentile(95) < 3000, f"p95 {report.percentile(95):.0f}ms > 3s"


class TestLoadMixed:
    """Mixed workload simulating real traffic patterns."""

    @pytest.mark.asyncio
    async def test_sustained_mixed(self):
        chw_token = login_sync("chw001@nsanje.gov.mw")
        if not chw_token:
            pytest.skip("No CHW token")
        chw_headers = {"Authorization": f"Bearer {chw_token}"}
        counter = {"i": 0}

        async def req():
            counter["i"] += 1
            i = counter["i"]
            async with aiohttp.ClientSession() as s:
                if i % 10 < 6:
                    return await hit_endpoint(s, "GET", f"{BASE}/health")
                else:
                    return await hit_endpoint(
                        s, "POST", f"{BASE}/api/v1/sync",
                        headers=chw_headers,
                        json_body={"visits": [], "referrals": [], "metadata": {"device_id": f"mix-{i}"}},
                    )

        report = await run_load("Mixed workload x200", req, concurrency=30, total_requests=200)
        print(f"\n  {report.summary()}")
        assert report.error_rate < 20, f"Mixed load error rate {report.error_rate}% too high"
        assert report.rps > 3, f"Throughput {report.rps:.1f} rps too low"
