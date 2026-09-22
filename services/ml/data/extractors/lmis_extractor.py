"""LMIS (Logistics Management Information System) extractor for Malawi commodity data."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

LMIS_CACHE_DIR = Path("cache/lmis")


class LMISClient:
    def __init__(
        self, base_url: str = "", api_key: str = "", cache_dir: Path | None = None
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.cache_dir = cache_dir or LMIS_CACHE_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._cache_ttl_hours = 12

    def fetch_stock_levels(self, facility_ids: list[str]) -> pd.DataFrame:
        if not self.base_url or not self.api_key:
            logger.info("LMIS API not configured — generating synthetic stock data")
            return self._synthetic_stock_levels(facility_ids)

        cache_key = self._cache_key("stock", facility_ids)
        cached = self._read_cache(cache_key)
        if cached is not None:
            return pd.DataFrame(cached)

        try:
            import httpx

            with httpx.Client(timeout=30) as client:
                resp = client.get(
                    f"{self.base_url}/api/v1/stock",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    params={"facilities": ",".join(facility_ids)},
                )
                resp.raise_for_status()
                data = resp.json()
                self._write_cache(cache_key, data)
                return pd.DataFrame(data.get("stock_levels", []))
        except Exception as e:  # noqa: BLE001
            logger.warning(f"LMIS API fetch failed: {e} — using synthetic data")
            return self._synthetic_stock_levels(facility_ids)

    def fetch_orders(self, facility_ids: list[str]) -> pd.DataFrame:
        if not self.base_url or not self.api_key:
            return self._synthetic_order_history(facility_ids)

        cache_key = self._cache_key("orders", facility_ids)
        cached = self._read_cache(cache_key)
        if cached is not None:
            return pd.DataFrame(cached)

        try:
            import httpx

            with httpx.Client(timeout=30) as client:
                resp = client.get(
                    f"{self.base_url}/api/v1/orders",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    params={"facilities": ",".join(facility_ids)},
                )
                resp.raise_for_status()
                data = resp.json()
                self._write_cache(cache_key, data)
                return pd.DataFrame(data.get("orders", []))
        except Exception as e:  # noqa: BLE001
            logger.warning(f"LMIS orders fetch failed: {e}")
            return self._synthetic_order_history(facility_ids)

    def parse_csv(self, file_path: str | Path) -> pd.DataFrame:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV file not found: {path}")

        df = pd.read_csv(path)
        required_cols = {
            "facility_id",
            "commodity",
            "stock_on_hand",
            "consumption_rate",
        }
        missing = required_cols - set(df.columns)
        if missing:
            raise ValueError(f"CSV missing required columns: {missing}")

        df["parsed_at"] = datetime.now(UTC)
        return df

    def validate_stock_data(self, df: pd.DataFrame) -> dict:
        anomalies = []
        if "stock_on_hand" in df.columns:
            neg = df[df["stock_on_hand"] < 0]
            if len(neg) > 0:
                anomalies.append(
                    {
                        "type": "negative_stock",
                        "count": len(neg),
                        "facilities": neg["facility_id"].unique().tolist()[:10],
                        "severity": "high",
                    }
                )

        if "consumption_rate" in df.columns:
            zero_cons = df[
                (df["consumption_rate"] == 0) & (df.get("stock_on_hand", 0) > 0)
            ]
            if len(zero_cons) > 0:
                anomalies.append(
                    {
                        "type": "zero_consumption_with_stock",
                        "count": len(zero_cons),
                        "severity": "medium",
                    }
                )

        if "days_of_stock" in df.columns:
            very_low = df[df["days_of_stock"] < 7]
            if len(very_low) > 0:
                anomalies.append(
                    {
                        "type": "critical_low_stock",
                        "count": len(very_low),
                        "facilities": very_low["facility_id"].unique().tolist()[:10],
                        "severity": "critical",
                    }
                )

        if "consumption_rate" in df.columns and "commodity" in df.columns:
            median_consumption = df.groupby("commodity")["consumption_rate"].median()
            for _, row in df.iterrows():
                commodity = row.get("commodity", "")
                rate = row.get("consumption_rate", 0)
                if commodity in median_consumption.index:
                    median = median_consumption[commodity]
                    if median > 0 and (rate > median * 5 or rate < median * 0.1):
                        anomalies.append(
                            {
                                "type": "consumption_spike",
                                "facility_id": row.get("facility_id"),
                                "commodity": commodity,
                                "rate": rate,
                                "median": median,
                                "severity": "medium",
                            }
                        )

        return {
            "total_records": len(df),
            "anomaly_count": len(anomalies),
            "anomalies": anomalies,
            "is_valid": len(
                [a for a in anomalies if a["severity"] in ("high", "critical")]
            )
            == 0,
        }

    def _synthetic_stock_levels(self, facility_ids: list[str]) -> pd.DataFrame:
        import numpy as np

        np.random.seed(42)
        commodities = [
            "ACT",
            "ORS",
            "Amoxicillin",
            "MuacTape",
            "ITN",
            "VitaminA",
            "Deworming",
        ]
        records = []
        for fid in facility_ids:
            for commodity in commodities:
                base_stock = np.random.randint(0, 500)
                base_consumption = np.random.randint(5, 50)
                records.append(
                    {
                        "facility_id": fid,
                        "commodity": commodity,
                        "stock_on_hand": int(base_stock),
                        "consumption_rate": int(base_consumption),
                        "days_of_stock": max(
                            0, int(base_stock / max(base_consumption, 1) * 30)
                        ),
                        "last_updated": (
                            datetime.now(UTC) - timedelta(days=np.random.randint(0, 14))
                        ).isoformat(),
                    }
                )
        return pd.DataFrame(records)

    def _synthetic_order_history(self, facility_ids: list[str]) -> pd.DataFrame:
        import numpy as np

        np.random.seed(42)
        records = []
        for fid in facility_ids:
            for i in range(6):
                order_date = datetime.now(UTC) - timedelta(weeks=i * 4)
                lead_time = np.random.randint(7, 45)
                records.append(
                    {
                        "facility_id": fid,
                        "commodity": np.random.choice(["ACT", "ORS", "Amoxicillin"]),
                        "order_date": order_date.isoformat(),
                        "quantity_ordered": int(np.random.randint(50, 500)),
                        "quantity_received": int(np.random.randint(40, 500)),
                        "lead_time_days": int(lead_time),
                        "status": np.random.choice(
                            ["delivered", "delivered", "in_transit"]
                        ),
                    }
                )
        return pd.DataFrame(records)

    def _cache_key(self, prefix: str, facility_ids: list[str]) -> str:
        raw = f"{prefix}:{','.join(sorted(facility_ids))}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _read_cache(self, key: str) -> list | None:
        cache_file = self.cache_dir / f"{key}.json"
        if not cache_file.exists():
            return None
        try:
            data = json.loads(cache_file.read_text())
            cached_at = datetime.fromisoformat(data["timestamp"])
            if datetime.now(UTC) - cached_at > timedelta(hours=self._cache_ttl_hours):
                return None
            return data["payload"]
        except Exception:  # noqa: BLE001
            return None

    def _write_cache(self, key: str, payload: Any) -> None:
        cache_file = self.cache_dir / f"{key}.json"
        cache_file.write_text(
            json.dumps(
                {
                    "timestamp": datetime.now(UTC).isoformat(),
                    "payload": payload,
                }
            )
        )
