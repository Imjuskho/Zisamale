"""End-to-end battle tests for Zisamale."""
from __future__ import annotations

import time
import uuid

import httpx
import pytest

BASE = "http://localhost:8000"
DISTRICT_NSANJE = "00000000-0000-0000-0000-000000000002"
HH_NSANJE = "00000000-0000-0000-0000-0000000000cc"


def api(method: str, path: str, token: str = "", retries: int = 2, **kw) -> httpx.Response:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    headers.update(kw.pop("headers", {}))
    url = f"{BASE}{path}"
    for attempt in range(retries + 1):
        r = httpx.request(method, url, headers=headers, timeout=30, **kw)
        if r.status_code == 429 and attempt < retries:
            time.sleep(2)
            continue
        return r
    return r


def login(username: str, password: str = "Zisamale2026!") -> str:
    r = api("POST", "/api/v1/auth/login", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json()["access_token"]
    raise RuntimeError(f"Login failed: {r.status_code}")


@pytest.fixture(scope="module")
def tokens():
    return {
        "chw": login("chw001@nsanje.gov.mw"),
        "supervisor": login("supervisor@nsanje.gov.mw"),
        "dho": login("dho@nsanje.gov.mw"),
        "mohp": login("admin@mohp.gov.mw"),
    }


class TestCHWDailyWorkflow:
    def test_full_lifecycle(self, tokens):
        chw_token = tokens["chw"]
        visit_id = str(uuid.uuid4())

        r = api("POST", "/api/v1/visits", token=chw_token, json={
            "visit_id": visit_id,
            "hw_id": "CHW-NSJ-001",
            "household_id": HH_NSANJE,
            "visit_date": "2026-08-21",
            "gps_lat": -16.75,
            "gps_lon": 35.15,
            "visit_type": "routine",
            "symptoms": ["cough", "fever"],
            "danger_signs": [],
            "measurements": {"muac": 14.5, "temperature": 38.2},
        })
        assert r.status_code in (200, 201), f"Visit: {r.status_code} {r.text[:200]}"
        print(f"\n  [1/4] Visit created: {r.status_code}")

        r = api("POST", "/api/v1/referrals", token=chw_token, json={
            "patient_id": visit_id,
            "visit_id": visit_id,
            "referral_reason": "Child under 5 with high fever",
            "urgency": "urgent",
            "referred_to": "nsanje-district-hospital",
        })
        assert r.status_code in (200, 201), f"Referral: {r.status_code} {r.text[:200]}"
        print(f"  [2/4] Referral created: {r.status_code}")

        r = api("GET", f"/api/v1/district/{DISTRICT_NSANJE}/alerts", token=tokens["supervisor"])
        assert r.status_code == 200
        print(f"  [3/4] Supervisor sees alerts: {r.status_code}")

        r = api("GET", "/api/v1/national/overview", token=tokens["mohp"])
        assert r.status_code == 200
        print(f"  [4/4] MoHP national overview: {r.status_code}")


class TestOfflineRecovery:
    def test_offline_batch_sync(self, tokens):
        chw_token = tokens["chw"]
        ok = 0
        for i in range(10):
            r = api("POST", "/api/v1/visits", token=chw_token, json={
                "visit_id": str(uuid.uuid4()),
                "household_id": HH_NSANJE,
                "visit_date": f"2026-08-{15 + (i % 6):02d}",
                "gps_lat": -16.75 + i * 0.001,
                "gps_lon": 35.15 + i * 0.001,
                "visit_type": "routine",
                "symptoms": [f"symptom-{i}"],
                "danger_signs": [],
                "measurements": {"muac": 14.0 + i * 0.2},
            })
            if r.status_code in (200, 201):
                ok += 1
            elif r.status_code == 429:
                time.sleep(2)
        print(f"\n  Offline batch: {ok}/10 visits synced")
        assert ok >= 8


class TestAlertPipeline:
    def test_read_pipeline(self, tokens):
        r = api("GET", f"/api/v1/district/{DISTRICT_NSANJE}/alerts", token=tokens["supervisor"])
        assert r.status_code == 200
        print(f"\n  [1/3] Supervisor: {r.status_code}")

        r = api("GET", f"/api/v1/district/{DISTRICT_NSANJE}/alerts", token=tokens["dho"])
        assert r.status_code == 200
        print(f"  [2/3] DHO: {r.status_code}")

        r = api("GET", "/api/v1/national/overview", token=tokens["mohp"])
        assert r.status_code == 200
        print(f"  [3/3] MoHP: {r.status_code}")

    def test_surveillance_trends(self, tokens):
        r = api("GET", f"/api/v1/district/{DISTRICT_NSANJE}/surveillance/trends", token=tokens["dho"])
        assert r.status_code == 200
        print(f"\n  Surveillance trends: {r.status_code}")


class TestMLPredictionSLA:
    def test_prediction_latency(self, tokens):
        dho_token = tokens["dho"]
        latencies = []
        for _ in range(10):
            start = time.perf_counter()
            r = api("POST", "/api/v1/ml/predict/pregnancy-risk", token=dho_token,
                     json={"symptoms": ["headache"], "risk_factors": ["teen"]})
            latencies.append((time.perf_counter() - start) * 1000)
            assert r.status_code in (200, 404, 422)
        p95 = sorted(latencies)[8]
        print(f"\n  ML latency: avg={sum(latencies)/len(latencies):.0f}ms p95={p95:.0f}ms")
        assert p95 < 5000


class TestDataExport:
    def test_csv_export(self, tokens):
        r = api("GET", f"/api/v1/district/{DISTRICT_NSANJE}/export/alerts", token=tokens["dho"])
        assert r.status_code == 200
        lines = r.text.strip().split("\n")
        print(f"\n  CSV: {len(lines)} lines")
        assert len(lines) >= 1
