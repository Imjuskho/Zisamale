"""Production DHIS2 integration client.

Features:
    - httpx.AsyncClient with connection pooling and lazy startup
    - Analytics pulls from /api/analytics/dataValueSets.json with pagination
    - Organisation-unit metadata lookups (children of a parent, or by level)
    - Event push for Zisamale indicators (program-stage events)
    - Circuit breaker (5 consecutive failures -> OPEN for 60s)
    - Retry with exponential backoff (1s..16s) on 503/504 and transport errors
    - Filesystem response cache with a 6-hour TTL keyed by request hash
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx

from app.config import settings
from app.integrations.circuit_breaker import CircuitBreaker, get_or_create_breaker

logger = logging.getLogger(__name__)

__all__ = [
    "DHIS2Client",
    "DHIS2Adapter",
    "DHIS2Error",
    "parse_analytics_payload",
]


class DHIS2Error(RuntimeError):
    """Raised when a DHIS2 request ultimately fails."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message)


def parse_analytics_payload(payload: dict[str, Any] | list) -> list[dict[str, Any]]:
    """Normalise DHIS2 analytics/dataValueSets JSON (or mock structures) into cells."""
    if isinstance(payload, list):
        rows = []
        for raw in payload:
            if isinstance(raw, dict):
                rows.append(_cell_from_mapping(raw))
            elif isinstance(raw, (list, tuple)) and len(raw) >= 4:
                rows.append(
                    {
                        "data_element": str(raw[0]),
                        "org_unit": str(raw[1]),
                        "period": str(raw[2]),
                        "value": raw[3],
                    }
                )
        return [row for row in rows if row.get("period")]
    headers = [str(h.get("name") or h.get("column") or "") for h in payload.get("headers") or []]
    parsed: list[dict[str, Any]] = []
    for raw in payload.get("rows") or []:
        cell = dict(zip(headers, raw, strict=False)) if headers else {}
        if not cell and isinstance(raw, (list, tuple)) and len(raw) >= 4:
            cell = {"dx": raw[0], "ou": raw[1], "pe": raw[2], "value": raw[3]}
        parsed.append(_cell_from_mapping(cell))
    for dv in payload.get("dataValues") or []:
        parsed.append(_cell_from_mapping(dv))
    return [row for row in parsed if row.get("period")]


def _cell_from_mapping(cell: dict[str, Any]) -> dict[str, Any]:
    return {
        "data_element": str(
            cell.get("dx")
            or cell.get("dataElement")
            or cell.get("data_element")
            or ""
        ),
        "org_unit": str(
            cell.get("ou") or cell.get("orgUnit") or cell.get("org_unit") or ""
        ),
        "period": str(cell.get("pe") or cell.get("period") or ""),
        "value": cell.get("value"),
    }


class DHIS2Client:
    """Async DHIS2 2.38+ client with resilience primitives."""

    RETRY_DELAYS: tuple[float, ...] = (1.0, 2.0, 4.0, 8.0, 16.0)
    RETRYABLE_STATUS_CODES: frozenset[int] = frozenset({503, 504})
    DEFAULT_CACHE_TTL_SECONDS: float = 6 * 3600.0
    MAX_PAGES: int = 100

    def __init__(
        self,
        *,
        base_url: str | None = None,
        username: str | None = None,
        password: str | None = None,
        timeout: float = 60.0,
        cache_dir: str | Path | None = None,
        cache_ttl_seconds: float | None = None,
        retry_delays: tuple[float, ...] | list[float] | None = None,
        breaker: CircuitBreaker | None = None,
        breaker_name: str = "dhis2",
        transport: httpx.AsyncTransport | None = None,
    ) -> None:
        self.base_url = (
            base_url if base_url is not None else settings.dhis2_base_url
        ).rstrip("/")
        self.username = username if username is not None else settings.dhis2_username
        self.password = password if password is not None else settings.dhis2_password
        self.timeout = timeout
        self.retry_delays: tuple[float, ...] = (
            tuple(retry_delays) if retry_delays is not None else self.RETRY_DELAYS
        )
        self.cache_dir = Path(
            cache_dir
            if cache_dir is not None
            else os.path.join(tempfile.gettempdir(), "zisamale_cache", "dhis2")
        )
        self.cache_ttl_seconds = (
            cache_ttl_seconds
            if cache_ttl_seconds is not None
            else self.DEFAULT_CACHE_TTL_SECONDS
        )
        self.breaker = breaker or get_or_create_breaker(breaker_name)
        self._transport = transport
        self._client: httpx.AsyncClient | None = None
        self.auth: httpx.BasicAuth | None = (
            httpx.BasicAuth(self.username, self.password) if self.username else None
        )

    # ------------------------------------------------------------- lifecycle

    @property
    def configured(self) -> bool:
        return bool(self.base_url)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                auth=self.auth,
                timeout=httpx.Timeout(self.timeout),
                transport=self._transport,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _api(self, path: str) -> str:
        root = self.base_url
        if root.endswith("/api"):
            return f"{root}{path}"
        return f"{root}/api{path}"

    # ------------------------------------------------------------------ core

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: list[tuple[str, str]] | dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        use_cache: bool = False,
    ) -> dict[str, Any]:
        """Perform an API call through cache, circuit breaker and retry policy."""
        if not self.configured:
            raise DHIS2Error("DHIS2 base URL is not configured")

        url = self._api(path)
        cache_key: str | None = None
        if use_cache and method.upper() == "GET":
            cache_key = self._cache_key(method, url, params)
            cached = self._cache_get(cache_key)
            if cached is not None:
                logger.debug("dhis2.cache_hit", extra={"url": url})
                return cached

        result = await self.breaker.call(
            self._request_with_retries, method, url, params, json_body
        )

        if cache_key is not None:
            self._cache_set(cache_key, result)
        return result

    async def _request_with_retries(
        self,
        method: str,
        url: str,
        params: list[tuple[str, str]] | dict[str, Any] | None,
        json_body: dict[str, Any] | None,
    ) -> dict[str, Any]:
        client = self._get_client()
        max_attempts = len(self.retry_delays) + 1
        last_status: int | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.request(
                    method, url, params=params, json=json_body
                )
            except httpx.TransportError as exc:
                if attempt >= max_attempts:
                    raise DHIS2Error(
                        f"DHIS2 unreachable after {attempt} attempts: {exc}"
                    ) from exc
                logger.warning(
                    "dhis2.transport_error_retry",
                    extra={"attempt": attempt, "error": str(exc)},
                )
                await asyncio.sleep(self.retry_delays[attempt - 1])
                continue

            last_status = response.status_code
            if response.status_code in self.RETRYABLE_STATUS_CODES:
                if attempt >= max_attempts:
                    break
                logger.warning(
                    "dhis2.retryable_status",
                    extra={"attempt": attempt, "status": response.status_code},
                )
                await asyncio.sleep(self.retry_delays[attempt - 1])
                continue

            if response.status_code >= 400:
                raise DHIS2Error(
                    f"DHIS2 returned {response.status_code} for {method} {url}: "
                    f"{response.text[:300]}",
                    status_code=response.status_code,
                )
            try:
                return response.json()
            except ValueError as exc:
                raise DHIS2Error(
                    f"DHIS2 returned invalid JSON for {method} {url}"
                ) from exc

        raise DHIS2Error(
            f"DHIS2 request failed after {max_attempts} attempts "
            f"(last status: {last_status}) for {method} {url}",
            status_code=last_status,
        )

    # ----------------------------------------------------------------- cache

    def _cache_key(
        self,
        method: str,
        url: str,
        params: list[tuple[str, str]] | dict[str, Any] | None,
    ) -> str:
        if isinstance(params, dict):
            normalised: list[list[str]] = sorted(
                [str(k), str(v)] for k, v in params.items()
            )
        else:
            normalised = sorted([str(k), str(v)] for k, v in (params or []))
        blob = json.dumps(
            {"method": method.upper(), "url": url, "params": normalised},
            sort_keys=True,
        ).encode()
        return hashlib.sha256(blob).hexdigest()

    def _cache_path(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"

    def _cache_get(self, key: str) -> dict[str, Any] | None:
        path = self._cache_path(key)
        try:
            with path.open("r", encoding="utf-8") as fh:
                envelope = json.load(fh)
            if float(envelope["expires_at"]) <= time.time():
                path.unlink(missing_ok=True)
                return None
            return envelope["payload"]
        except FileNotFoundError:
            return None
        except (OSError, ValueError, KeyError, TypeError):
            logger.warning("dhis2.cache_read_failed", extra={"key": key})
            return None

    def _cache_set(self, key: str, payload: dict[str, Any]) -> None:
        path = self._cache_path(key)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            envelope = {
                "created_at": time.time(),
                "expires_at": time.time() + self.cache_ttl_seconds,
                "payload": payload,
            }
            fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(envelope, fh)
            os.replace(tmp_path, path)
        except OSError:
            logger.warning("dhis2.cache_write_failed", extra={"key": key})

    # ------------------------------------------------------------------- API

    async def fetch_analytics(
        self,
        org_units: list[str],
        data_elements: list[str],
        periods: str,
        page_size: int = 250,
    ) -> list[dict[str, Any]]:
        """Pull data values for org units / elements / periods across all pages.

        Returns normalised cells: {data_element, org_unit, period, value}.
        """
        if not org_units or not data_elements or not periods:
            raise ValueError(
                "org_units, data_elements and periods are all required"
            )
        values: list[dict[str, Any]] = []
        page = 1
        while page <= self.MAX_PAGES:
            params = [
                ("dimension", f"dx:{','.join(data_elements)}"),
                ("dimension", f"ou:{','.join(org_units)}"),
                ("dimension", f"pe:{periods}"),
                ("displayProperty", "NAME"),
                ("skipMeta", "true"),
                ("page", str(page)),
                ("pageSize", str(page_size)),
            ]
            payload = await self.request(
                "GET", "/analytics/dataValueSets.json", params=params, use_cache=True
            )
            values.extend(payload.get("dataValues") or [])
            pager = payload.get("pager") or {}
            try:
                page_count = int(pager.get("pageCount") or 1)
            except (TypeError, ValueError):
                page_count = 1
            if page >= page_count:
                break
            page += 1
        cells = parse_analytics_payload({"dataValues": values})
        logger.info(
            "dhis2.analytics_fetched",
            extra={"cells": len(cells), "pages": page, "org_units": len(org_units)},
        )
        return cells

    async def fetch_org_units(
        self,
        parent_id: str | None = None,
        level: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch facility metadata: children of `parent_id`, or units at `level`."""
        params: dict[str, str] = {
            "fields": "id,name,level,path,parent[id,name]",
            "paging": "false",
        }
        if parent_id:
            params["filter"] = f"parent.id:eq:{parent_id}"
        elif level:
            params["filter"] = f"level:eq:{level}"
        payload = await self.request(
            "GET", "/organisationUnits.json", params=params, use_cache=True
        )
        return list(payload.get("organisationUnits") or [])

    async def push_events(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        """Push Zisamale indicators as DHIS2 program events.

        Each event needs: orgUnit, eventDate, dataValues[{dataElement, value}].
        `program` may be supplied per event or falls back to
        settings.dhis2_event_program.
        """
        if not events:
            return {"status": "skipped", "imported": 0, "updated": 0, "ignored": 0}

        normalised: list[dict[str, Any]] = []
        for index, event in enumerate(events):
            if not isinstance(event, dict):
                raise ValueError(f"event #{index} must be a mapping")
            missing = [
                field
                for field in ("orgUnit", "eventDate", "dataValues")
                if not event.get(field)
            ]
            if missing:
                raise ValueError(f"event #{index} missing fields: {missing}")
            program = event.get("program") or settings.dhis2_event_program
            if not program:
                raise ValueError(
                    f"event #{index} has no program and dhis2_event_program unset"
                )
            normalised.append({**event, "program": program})

        payload = await self.request(
            "POST", "/events.json", json_body={"events": normalised}
        )
        summary = self._import_summary(payload)
        logger.info("dhis2.events_pushed", extra={**summary, "sent": len(normalised)})
        return summary

    async def push_data_values(
        self, data_values: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Push aggregate data values to /api/dataValueSets."""
        if not data_values:
            return {"status": "skipped", "imported": 0, "updated": 0, "ignored": 0}
        payload = await self.request(
            "POST", "/dataValueSets.json", json_body={"dataValues": data_values}
        )
        summary = self._import_summary(payload)
        logger.info("dhis2.data_values_pushed", extra={**summary})
        return summary

    @staticmethod
    def _import_summary(payload: dict[str, Any]) -> dict[str, Any]:
        summaries = payload.get("importSummaries") or (
            [payload] if payload.get("status") else []
        )
        imported = sum(int(s.get("importCount", {}).get("imported") or 0) for s in summaries)
        updated = sum(int(s.get("importCount", {}).get("updated") or 0) for s in summaries)
        ignored = sum(int(s.get("importCount", {}).get("ignored") or 0) for s in summaries)
        status = "ok"
        if summaries and any(
            str(s.get("status", "")).upper() != "SUCCESS" for s in summaries
        ):
            status = "partial"
        return {
            "status": status,
            "imported": imported,
            "updated": updated,
            "ignored": ignored,
            "detail": summaries if summaries else payload,
        }


class DHIS2Adapter:
    """Backwards-compatible facade over :class:`DHIS2Client`.

    Preserves the interface consumed by app.integrations.ingest.
    """

    def __init__(self, client: DHIS2Client | None = None) -> None:
        self.client = client or DHIS2Client()

    @property
    def base_url(self) -> str:
        return self.client.base_url

    async def get_data(
        self,
        data_elements: list[str],
        org_units: list[str],
        periods: str,
    ) -> list[dict[str, Any]]:
        if not self.client.configured:
            logger.warning("DHIS2 not configured, returning empty data")
            return []
        return await self.client.fetch_analytics(
            org_units=org_units, data_elements=data_elements, periods=periods
        )

    async def get_org_units(self, level: int = 4) -> list[dict[str, Any]]:
        if not self.client.configured:
            return []
        return await self.client.fetch_org_units(level=level)

    async def push_indicator(
        self, data_element: str, org_unit: str, period: str, value: float
    ) -> bool:
        if not self.client.configured:
            return False
        try:
            summary = await self.client.push_data_values(
                [
                    {
                        "dataElement": data_element,
                        "orgUnit": org_unit,
                        "period": period,
                        "value": value,
                    }
                ]
            )
        except DHIS2Error:
            return False
        return summary.get("status") in {"ok", "partial"}
