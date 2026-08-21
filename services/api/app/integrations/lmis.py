"""Production LMIS (Logistics Management Information System) integration.

Primary source is the LMIS REST API; when the API is not configured or
unreachable, stock data falls back to CSV files that districts upload
manually. Includes record validation and anomaly detection for both paths.
"""

from __future__ import annotations

import csv
import logging
import statistics
from datetime import date, datetime
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

__all__ = [
    "LMISClient",
    "LMISAdapter",
    "LMISError",
    "STOCK_CSV_COLUMNS",
    "ORDER_CSV_COLUMNS",
]

STOCK_CSV_COLUMNS = (
    "facility_id",
    "commodity_code",
    "commodity_name",
    "stock_on_hand",
    "average_monthly_consumption",
    "monthly_consumption",
    "last_order_date",
)

ORDER_CSV_COLUMNS = (
    "facility_id",
    "order_id",
    "commodity_code",
    "quantity",
    "order_date",
    "delivery_date",
    "status",
)


class LMISError(RuntimeError):
    """Raised when the LMIS REST API ultimately fails."""


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    number = _to_float(value)
    return int(number) if number is not None else None


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text[: len(fmt) + 2], fmt).date()
        except ValueError:
            continue
    return None


def validate_stock_record(record: dict[str, Any]) -> list[str]:
    """Return a list of validation problems for a stock record (empty = valid)."""
    problems: list[str] = []
    if not str(record.get("facility_id") or "").strip():
        problems.append("missing_facility_id")
    if not str(record.get("commodity_code") or "").strip():
        problems.append("missing_commodity_code")
    soh = _to_float(record.get("stock_on_hand"))
    if soh is None:
        problems.append("missing_stock_on_hand")
    elif soh < 0:
        problems.append("negative_stock_on_hand")
    amc = _to_float(
        record.get("average_monthly_consumption")
        or record.get("monthly_consumption")
    )
    if amc is not None and amc < 0:
        problems.append("negative_consumption")
    return problems


def compute_days_of_stock(record: dict[str, Any]) -> float | None:
    """Days of stock on hand at average monthly consumption burn rate."""
    soh = _to_float(record.get("stock_on_hand"))
    amc = _to_float(
        record.get("average_monthly_consumption")
        or record.get("monthly_consumption")
    )
    if soh is None:
        return None
    if amc is None or amc <= 0:
        return None
    return round(soh / (amc / 30.0), 1)


def detect_anomalies(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flag per-record anomalies in-place and return the flagged records.

    Checks:
        - validation failures (missing/negative fields)
        - consumption spikes: monthly consumption > 3x median for commodity
        - stock-outs imminent: days of stock below 7
        - stale data: last order older than 180 days
    """
    by_commodity: dict[str, list[float]] = {}
    for record in records:
        code = str(record.get("commodity_code") or "")
        consumption = _to_float(
            record.get("average_monthly_consumption")
            or record.get("monthly_consumption")
        )
        if code and consumption is not None and consumption >= 0:
            by_commodity.setdefault(code, []).append(consumption)

    flagged: list[dict[str, Any]] = []
    for record in records:
        anomalies = validate_stock_record(record)

        code = str(record.get("commodity_code") or "")
        consumption = _to_float(
            record.get("average_monthly_consumption")
            or record.get("monthly_consumption")
        )
        peers = by_commodity.get(code) or []
        if consumption is not None and len(peers) >= 3:
            median = statistics.median(peers)
            if median > 0 and consumption > 3 * median:
                anomalies.append("consumption_spike")

        days_of_stock = record.get("days_of_stock")
        if isinstance(days_of_stock, (int, float)) and 0 <= days_of_stock < 7:
            anomalies.append("low_days_of_stock")

        last_order = _parse_date(record.get("last_order_date"))
        if last_order and (date.today() - last_order).days > 180:
            anomalies.append("stale_last_order")

        if anomalies:
            existing = record.get("anomalies")
            merged = sorted(set(list(existing or []) + anomalies))
            record["anomalies"] = merged
            flagged.append(record)
    return flagged


class LMISClient:
    """LMIS REST client with CSV fallback, validation and anomaly detection."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        csv_path: str | Path | None = None,
        timeout: float = 30.0,
        transport: httpx.AsyncTransport | None = None,
    ) -> None:
        self.base_url = (
            base_url if base_url is not None else settings.lmis_base_url
        ).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.lmis_api_key
        self.csv_path = Path(
            csv_path if csv_path is not None else settings.lmis_csv_path
        )
        self.timeout = timeout
        self._transport = transport
        self._client: httpx.AsyncClient | None = None

    @property
    def configured(self) -> bool:
        return bool(self.base_url)

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout), transport=self._transport
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _get_json(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.configured:
            raise LMISError("LMIS base URL is not configured")
        client = await self._get_client()
        try:
            response = await client.get(
                f"{self.base_url}{path}", params=params, headers=self._headers()
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise LMISError(f"LMIS request failed for {path}: {exc}") from exc
        except ValueError as exc:
            raise LMISError(f"LMIS returned invalid JSON for {path}") from exc
        if isinstance(payload, dict):
            payload = payload.get("results") or payload.get("data") or []
        return list(payload)

    # ------------------------------------------------------------------- API

    async def fetch_stock_levels(
        self, facility_ids: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """Stock on hand, consumption and days-of-stock per facility/commodity.

        Falls back to the uploaded CSV when the REST API is unconfigured.
        """
        records: list[dict[str, Any]]
        try:
            params: dict[str, Any] = {}
            if facility_ids:
                params["facility_ids"] = ",".join(facility_ids)
            records = await self._get_json("/api/v1/stock", params)
        except LMISError as exc:
            if self.csv_path.is_file():
                logger.warning(
                    "lmis.rest_failed_csv_fallback",
                    extra={"error": str(exc)},
                )
                records = self.parse_csv(self.csv_path, kind="stock")
            else:
                raise

        normalised: list[dict[str, Any]] = []
        for raw in records:
            record = dict(raw)
            facility = str(record.get("facility_id") or "")
            if facility_ids and facility not in facility_ids:
                continue
            record.setdefault("days_of_stock", compute_days_of_stock(record))
            normalised.append(record)
        detect_anomalies(normalised)
        return normalised

    async def fetch_orders(
        self, facility_ids: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """Order history with computed lead times in days."""
        params: dict[str, Any] = {}
        if facility_ids:
            params["facility_ids"] = ",".join(facility_ids)
        orders = await self._get_json("/api/v1/orders", params)

        normalised: list[dict[str, Any]] = []
        for raw in orders:
            order = dict(raw)
            facility = str(order.get("facility_id") or "")
            if facility_ids and facility not in facility_ids:
                continue
            ordered = _parse_date(order.get("order_date"))
            delivered = _parse_date(order.get("delivery_date"))
            if ordered and delivered:
                order["lead_time_days"] = max(0, (delivered - ordered).days)
            normalised.append(order)
        return normalised

    # -------------------------------------------------------------------- CSV

    @staticmethod
    def parse_csv(
        file_path: str | Path,
        kind: str = "stock",
    ) -> list[dict[str, Any]]:
        """Parse a manually-uploaded LMIS CSV (stock or orders).

        Rows that fail validation are still returned but carry an
        `anomalies` list describing the problems, so upload previews can
        show exactly what will be imported.
        """
        path = Path(file_path)
        records: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            fieldnames = [fn.strip() for fn in (reader.fieldnames or [])]
            missing_required = [
                col for col in ("facility_id",) if col not in fieldnames
            ]
            if missing_required:
                raise ValueError(
                    f"CSV missing required columns: {missing_required}"
                )
            for row_number, row in enumerate(reader, start=2):
                record = {
                    (key.strip() if key else key): (
                        value.strip() if isinstance(value, str) else value
                    )
                    for key, value in row.items()
                    if key
                }
                record["row_number"] = row_number
                if kind == "stock":
                    record["days_of_stock"] = compute_days_of_stock(record)
                    problems = validate_stock_record(record)
                    if problems:
                        record["anomalies"] = problems
                records.append(record)

        if kind == "stock":
            detect_anomalies(records)
        valid = sum(1 for r in records if not r.get("anomalies"))
        logger.info(
            "lmis.csv_parsed",
            extra={"path": str(path), "rows": len(records), "valid": valid},
        )
        return records


class LMISAdapter(LMISClient):
    """Backwards-compatible alias preserving the original adapter methods."""

    async def get_stock_levels(
        self, facility_id: str | None = None
    ) -> list[dict[str, Any]]:
        ids = [facility_id] if facility_id else None
        return await self.fetch_stock_levels(ids)

    async def get_consumption_data(
        self, commodity_id: str, months: int = 6
    ) -> list[dict[str, Any]]:
        if not self.configured:
            return []
        return await self._get_json(
            "/api/v1/consumption",
            {"commodity_id": commodity_id, "months": months},
        )
