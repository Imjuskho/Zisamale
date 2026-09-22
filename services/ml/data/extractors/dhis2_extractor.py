"""DHIS2 API client for Malawi health surveillance data.

Talks to a live DHIS2 instance (e.g. the Malawi MoH national server) over its
REST analytics API:

    * :meth:`DHIS2Extractor.fetch_weekly_epidemiological_data` -- weekly case
      counts per org unit / data element via ``/api/analytics`` (paginated,
      max 50,000 rows per page, retries on 503/504).
    * :meth:`DHIS2Extractor.fetch_facility_data` -- organisation-unit metadata.
    * :meth:`DHIS2Extractor.push_ai_indicators` -- writes Zisamale model
      predictions back into DHIS2 as data values.

Responses are cached with a 6-hour TTL (Redis when available, filesystem
otherwise). The HTTP session is injectable for testing without network access.
"""

from __future__ import annotations

import contextlib
import logging
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from . import BaseExtractor, CircuitBreaker, PermanentError, RetryPolicy, TransientError

logger = logging.getLogger(__name__)

try:  # requests is optional at import time so tests can inject fake sessions
    import requests
except ImportError:  # pragma: no cover - depends on environment
    requests = None  # type: ignore[assignment]

#: DHIS2 caps analytics responses at 50,000 rows per page.
MAX_PAGE_SIZE = 50_000

_RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


@dataclass(frozen=True)
class DHIS2Config:
    """Connection settings for a DHIS2 instance.

    Attributes:
        base_url: Server root, e.g. ``https://dhis2.health.gov.mw``.
        username: Basic-auth username.
        password: Basic-auth password.
        api_path: API root path on the server.
        timeout_seconds: Per-request timeout.
        page_size: Analytics page size (capped at :data:`MAX_PAGE_SIZE`).
        extra_params: Extra query params sent with every analytics call.
    """

    base_url: str
    username: str
    password: str
    api_path: str = "/api"
    timeout_seconds: float = 30.0
    page_size: int = MAX_PAGE_SIZE
    extra_params: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.page_size > MAX_PAGE_SIZE:
            raise ValueError(f"page_size cannot exceed {MAX_PAGE_SIZE}")


class DHIS2Extractor(BaseExtractor):
    """Production client for the DHIS2 REST API with caching and resilience.

    Args:
        config: Connection settings.
        session: Optional pre-built ``requests.Session`` (tests may inject a
            stub). When omitted a real session with Basic Auth is created.
        cache_ttl_seconds: Response cache TTL; defaults to 6 hours.
        redis_client / cache_dir / retry_policy / circuit_breaker /
        sleep_fn / rng: Forwarded to :class:`BaseExtractor`.
    """

    def __init__(
        self,
        config: DHIS2Config,
        session: Any | None = None,
        cache_ttl_seconds: float = 6 * 3600,
        redis_client: Any | None = None,
        cache_dir: str | Path | None = None,
        retry_policy: RetryPolicy | None = None,
        circuit_breaker: CircuitBreaker | None = None,
        sleep_fn: Any = None,
        rng: Any | None = None,
    ) -> None:
        super().__init__(
            name="dhis2",
            cache_ttl_seconds=cache_ttl_seconds,
            redis_client=redis_client,
            cache_dir=cache_dir,
            retry_policy=retry_policy or RetryPolicy(max_attempts=4, backoff_base=1.5),
            circuit_breaker=circuit_breaker,
            sleep_fn=sleep_fn or time.sleep,
            rng=rng,
        )
        self.config = config
        if session is not None:
            self._session = session
        else:
            if requests is None:
                raise ImportError(
                    "The 'requests' package is required to talk to DHIS2. "
                    "Install it or inject a pre-built session."
                )
            self._session = requests.Session()
            self._session.auth = (config.username, config.password)

    # ------------------------------------------------------------------ #
    # Low-level HTTP helpers
    # ------------------------------------------------------------------ #

    def _url(self, path: str) -> str:
        return f"{self.config.base_url.rstrip('/')}{self.config.api_path}{path}"

    def _to_error(self, exc: Exception) -> TransientError | PermanentError:
        """Map an HTTP-layer exception onto the retry taxonomy."""
        response = getattr(exc, "response", None)
        status = getattr(response, "status_code", None)
        if status is not None and status in _RETRYABLE_STATUS_CODES:
            return TransientError(
                f"DHIS2 returned {status}: retryable upstream failure"
            )
        if status is not None:
            body = ""
            with contextlib.suppress(Exception):
                body = str(getattr(response, "text", ""))[:300]
            return PermanentError(f"DHIS2 rejected request ({status}): {body}")
        return TransientError(f"DHIS2 connection failure: {exc}")

    def _get_json(
        self, path: str, params: Mapping[str, Any] | None = None
    ) -> dict[str, Any]:
        """GET a JSON document with retries, breaker protection and error mapping."""
        url = self._url(path)

        def operation() -> dict[str, Any]:
            try:
                response = self._session.get(
                    url,
                    params=dict(params or {}),
                    timeout=self.config.timeout_seconds,
                )
            except Exception as exc:  # timeouts, connection resets, etc.
                raise self._to_error(exc) from exc
            if response.status_code >= 400:
                raise _HTTPStatusError(response)
            return response.json()

        return self._execute(operation, f"GET {path}")

    def _post_json(self, path: str, payload: Mapping[str, Any]) -> dict[str, Any]:
        """POST a JSON document with retries and breaker protection."""
        url = self._url(path)

        def operation() -> dict[str, Any]:
            try:
                response = self._session.post(
                    url,
                    json=payload,
                    timeout=self.config.timeout_seconds,
                )
            except Exception as exc:
                raise self._to_error(exc) from exc
            if response.status_code >= 400:
                raise _HTTPStatusError(response)
            return response.json()

        return self._execute(operation, f"POST {path}")

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def fetch_weekly_epidemiological_data(
        self,
        org_units: Sequence[str],
        data_elements: Sequence[str],
        periods: Sequence[str],
    ) -> pd.DataFrame:
        """Fetch weekly epidemiological data from the DHIS2 analytics endpoint.

        Args:
            org_units: Organisation-unit UIDs (facilities / TAs / districts).
            data_elements: Data-element UIDs (e.g. confirmed malaria cases).
            periods: ISO-style periods such as ``202501W03`` or ``2025W03``.

        Returns:
            DataFrame with columns ``org_unit``, ``data_element``, ``period``
            and ``value`` (numeric), one row per analytics cell.

        Raises:
            PermanentError: On 4xx responses or malformed payloads.
            TransientError: When retries against 5xx/timeout are exhausted.
        """
        if not org_units or not data_elements or not periods:
            raise ValueError(
                "org_units, data_elements and periods must all be non-empty"
            )

        dimension = (
            f"dx:{';'.join(data_elements)};"
            f"pe:{';'.join(periods)};"
            f"ou:{';'.join(org_units)}"
        )

        rows: list[list[Any]] = []
        headers: list[dict[str, Any]] = []
        page = 1

        while True:
            params: dict[str, Any] = {
                "dimension": dimension,
                "pageSize": min(self.config.page_size, MAX_PAGE_SIZE),
                "page": page,
                "displayProperty": "NAME",
                **dict(self.config.extra_params),
            }
            key_parts = [
                "analytics",
                sorted(org_units),
                sorted(data_elements),
                sorted(periods),
                page,
            ]
            payload = self._cached(
                key_parts, lambda p=params: self._get_json("/analytics", p)
            )

            headers = payload.get("headers") or headers
            rows.extend(payload.get("rows") or [])

            pager = payload.get("pager") or {}
            page_count = int(pager.get("pageCount", 1))
            if page >= page_count:
                break
            page += 1

        if not headers:
            raise PermanentError("DHIS2 analytics response contained no headers")

        column_names = [str(h.get("name")) for h in headers]
        frame = pd.DataFrame(rows, columns=column_names)
        if frame.empty:
            logger.warning(
                "DHIS2 analytics returned 0 rows for the requested dimensions"
            )
            return pd.DataFrame(columns=["org_unit", "data_element", "period", "value"])

        rename_map = {"dx": "data_element", "pe": "period", "ou": "org_unit"}
        frame = frame.rename(columns=rename_map)
        frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
        return frame[["org_unit", "data_element", "period", "value"]]

    def fetch_facility_data(self, org_units: Sequence[str]) -> list[dict[str, Any]]:
        """Fetch organisation-unit metadata for facilities.

        Args:
            org_units: Organisation-unit UIDs to describe.

        Returns:
            List of metadata dicts with fields ``id``, ``name``, ``level``,
            ``parent``, ``coordinates`` and ``openingDate``.
        """
        results: list[dict[str, Any]] = []
        chunk_size = 200
        for start in range(0, len(org_units), chunk_size):
            chunk = list(org_units[start : start + chunk_size])
            filter_expr = f"id:in:[{','.join(chunk)}]"
            key_parts = ["orgUnits", tuple(chunk)]
            payload = self._cached(
                key_parts,
                lambda f=filter_expr: self._get_json(
                    "/organisationUnits",
                    {
                        "filter": f,
                        "fields": "id,name,shortName,level,parent[id,name],coordinates,openingDate,closedDate",
                        "paging": "false",
                    },
                ),
            )
            results.extend(payload.get("organisationUnits") or [])
        return results

    def push_ai_indicators(
        self, indicators: Sequence[Mapping[str, Any]]
    ) -> dict[str, Any]:
        """Push Zisamale predictions back to DHIS2 as data values.

        Args:
            indicators: Sequence of dicts with keys ``org_unit``, ``period``,
                ``data_element`` and ``value``; optional ``comment`` and
                ``category_option_combo`` are honoured.

        Returns:
            The DHIS2 import summary (imported/updated/ignored counts).

        Raises:
            ValueError: If an indicator record is missing required keys.
            PermanentError: If DHIS2 reports a failed import.
        """
        required = {"org_unit", "period", "data_element", "value"}
        data_values: list[dict[str, Any]] = []
        for indicator in indicators:
            missing = required - set(indicator)
            if missing:
                raise ValueError(f"Indicator missing required keys: {sorted(missing)}")
            entry: dict[str, Any] = {
                "orgUnit": indicator["org_unit"],
                "period": indicator["period"],
                "dataElement": indicator["data_element"],
                "value": indicator["value"],
            }
            if "category_option_combo" in indicator:
                entry["categoryOptionCombo"] = indicator["category_option_combo"]
            if "comment" in indicator:
                entry["comment"] = str(indicator["comment"])
            data_values.append(entry)

        summary = self._post_json("/dataValueSets", {"dataValues": data_values})
        status = str(summary.get("status", "")).upper()
        if status not in {"SUCCESS", "WARNING"}:
            raise PermanentError(f"DHIS2 import failed: {summary}")
        logger.info(
            "Pushed %d AI indicators to DHIS2 (imported=%s updated=%s)",
            len(data_values),
            summary.get("importCount", {}).get("imported"),
            summary.get("importCount", {}).get("updated"),
        )
        return summary


class _HTTPStatusError(PermanentError):
    """Internal wrapper carrying a non-2xx HTTP response."""

    def __init__(self, response: Any) -> None:
        self.response = response
        snippet = ""
        with contextlib.suppress(Exception):
            snippet = str(response.text)[:300]
        super().__init__(f"HTTP {response.status_code} from DHIS2: {snippet}")


__all__ = ["MAX_PAGE_SIZE", "DHIS2Config", "DHIS2Extractor"]
