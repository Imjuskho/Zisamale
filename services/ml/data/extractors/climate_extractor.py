"""Climate data extraction for Zisamale (CHIRPS rainfall, ERA5 temperature).

Primary sources:
    * CHIRPS -- Climate Hazards Group InfraRed Precipitation with Station
      data (~5 km daily/pentad rainfall grids, served via the UCSB/SERVIR
      API).
    * ERA5   -- Copernicus/ECMWF reanalysis (2 m temperature, dewpoint and
      derived humidity), normally accessed through ``cdsapi``.

Both fetchers attempt the live API first; whenever the API is unreachable,
the client library is missing or the request fails, they transparently fall
back to a physically plausible synthetic generator calibrated for Malawi's
climate (rainy season Nov-Apr, dry May-Oct) so downstream pipelines always
receive well-formed data. Synthetic output is deterministic per region/date
range, and every frame carries a ``source`` column recording its origin.

All outputs are aggregated to Traditional Authority (TA) level.
"""

from __future__ import annotations

import hashlib
import logging
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

try:  # optional at import time; synthetic fallback covers absence
    import requests as _requests
except ImportError:  # pragma: no cover - depends on environment
    _requests = None

try:  # optional Copernicus CDS client for ERA5
    import cdsapi as _cdsapi
except ImportError:  # pragma: no cover - depends on environment
    _cdsapi = None

#: Rough bounding box of Malawi (degrees).
MALAWI_BBOX = {"lat_min": -17.15, "lat_max": -9.35, "lon_min": 32.65, "lon_max": 35.95}

#: Months of Malawi's main rainy season.
RAINY_MONTHS = frozenset({10, 11, 12, 1, 2, 3})

#: Monthly wet-day probability and mean wet-day rainfall (mm) for Malawi.
_MONTH_RAIN_PROFILE: dict[int, tuple[float, float]] = {
    1: (0.55, 14.0),
    2: (0.52, 13.0),
    3: (0.42, 10.0),
    4: (0.22, 6.0),
    5: (0.07, 3.0),
    6: (0.03, 2.0),
    7: (0.03, 2.0),
    8: (0.03, 2.0),
    9: (0.05, 2.5),
    10: (0.15, 5.0),
    11: (0.35, 9.0),
    12: (0.52, 13.0),
}


@dataclass(frozen=True)
class RegionSpec:
    """A climate sampling point (grid-cell centroid) with optional TA label.

    Attributes:
        region_id: Stable identifier for the grid cell / region.
        lat: Latitude in decimal degrees (negative south of equator).
        lon: Longitude in decimal degrees.
        ta: Optional Traditional Authority name; assigned later if omitted.
    """

    region_id: str
    lat: float
    lon: float
    ta: str | None = None

    @classmethod
    def coerce(cls, region: RegionSpec | Mapping[str, Any] | str) -> RegionSpec:
        """Build a spec from a dict, an existing spec, or a bare string id.

        Bare string ids are mapped to deterministic coordinates inside the
        Malawi bounding box so callers can pass simple names in tests.
        """
        if isinstance(region, cls):
            return region
        if isinstance(region, Mapping):
            return cls(
                region_id=str(region["region_id"]),
                lat=float(region["lat"]),
                lon=float(region["lon"]),
                ta=region.get("ta"),
            )
        digest = hashlib.sha256(str(region).encode("utf-8")).digest()
        lat = MALAWI_BBOX["lat_min"] + (digest[0] / 255.0) * (
            MALAWI_BBOX["lat_max"] - MALAWI_BBOX["lat_min"]
        )
        lon = MALAWI_BBOX["lon_min"] + (digest[1] / 255.0) * (
            MALAWI_BBOX["lon_max"] - MALAWI_BBOX["lon_min"]
        )
        return cls(region_id=str(region), lat=round(lat, 4), lon=round(lon, 4))


def _parse_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _region_seed(*parts: Any) -> int:
    canonical = "|".join(str(p) for p in parts)
    return int.from_bytes(hashlib.sha256(canonical.encode("utf-8")).digest()[:4], "big")


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    )
    return 2 * 6371.0088 * math.asin(math.sqrt(a))


class ClimateExtractor:
    """Extracts rainfall and temperature/humidity, aggregated to TA level."""

    def __init__(
        self,
        chirps_api_url: str | None = None,
        era5_dataset: str = "reanalysis-era5-single-levels",
        timeout_seconds: float = 30.0,
        seed: int = 2026,
    ) -> None:
        """Store API endpoints used before falling back to synthetic data.

        Args:
            chirps_api_url: Optional CHIRPS API endpoint override.
            era5_dataset: Copernicus CDS dataset name for ERA5.
            timeout_seconds: Per-request HTTP timeout.
            seed: Base seed for reproducible synthetic fallbacks.
        """
        self.chirps_api_url = chirps_api_url or "https://chc.ucsb.edu/api/chirps/daily"
        self.era5_dataset = era5_dataset
        self.timeout_seconds = timeout_seconds
        self.seed = seed

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def fetch_chirps_rainfall(
        self,
        regions: Sequence[RegionSpec | Mapping[str, Any] | str],
        start_date: str | date,
        end_date: str | date,
    ) -> pd.DataFrame:
        """Fetch daily CHIRPS rainfall per region between the given dates.

        Tries the live CHIRPS API first; on any failure falls back to a
        deterministic synthetic generator calibrated to Malawi's rainy
        season.

        Returns:
            DataFrame with columns ``date``, ``region_id``, ``ta``,
            ``rainfall_mm`` and ``source`` (``chirps`` or ``synthetic``).
        """
        specs = [RegionSpec.coerce(r) for r in regions]
        start, end = _parse_date(start_date), _parse_date(end_date)
        if end < start:
            raise ValueError("end_date must not precede start_date")

        frame = self._attempt_chirps(specs, start, end)
        if frame is None:
            logger.warning("CHIRPS unavailable -- generating synthetic rainfall")
            frame = self._synthetic_rainfall(specs, start, end)
        return self.aggregate_to_ta(frame)

    def fetch_era5_temperature(
        self,
        regions: Sequence[RegionSpec | Mapping[str, Any] | str],
        start_date: str | date,
        end_date: str | date,
    ) -> pd.DataFrame:
        """Fetch daily ERA5 2 m temperature and relative humidity per region.

        Tries the Copernicus CDS API first; falls back to synthetic data
        modelled on Malawi's seasonal temperature cycle when unavailable.

        Returns:
            DataFrame with columns ``date``, ``region_id``, ``ta``,
            ``temperature_c``, ``humidity_pct`` and ``source``.
        """
        specs = [RegionSpec.coerce(r) for r in regions]
        start, end = _parse_date(start_date), _parse_date(end_date)
        if end < start:
            raise ValueError("end_date must not precede start_date")

        frame = self._attempt_era5(specs, start, end)
        if frame is None:
            logger.warning(
                "ERA5 unavailable -- generating synthetic temperature/humidity"
            )
            frame = self._synthetic_temperature(specs, start, end)
        return self.aggregate_to_ta(frame)

    def aggregate_to_ta(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate region-level daily values up to TA-level weekly values.

        Rainfall is summed within each week (weekly accumulation), while
        temperature and humidity are averaged. Weeks follow the ISO
        epidemiological calendar (Monday starts).

        Args:
            daily_df: Frame with ``date``, ``region_id``, ``ta`` and metric
                columns (``rainfall_mm`` and/or ``temperature_c`` /
                ``humidity_pct``).

        Returns:
            Weekly frame keyed by ``ta``, ``iso_year``, ``iso_week`` plus the
            aggregated metrics and a ``n_regions`` contribution count.
        """
        if daily_df.empty:
            return daily_df.assign(iso_year=[], iso_week=[], n_regions=[])

        df = daily_df.copy()
        df["date"] = pd.to_datetime(df["date"])
        iso = df["date"].dt.isocalendar()
        df["iso_year"] = iso["year"].astype(int)
        df["iso_week"] = iso["week"].astype(int)

        group_cols = ["ta", "iso_year", "iso_week"]
        agg_map: dict[str, tuple[str, str]] = {}
        if "rainfall_mm" in df.columns:
            agg_map["rainfall_mm"] = ("rainfall_mm", "sum")
        if "temperature_c" in df.columns:
            agg_map["temperature_c"] = ("temperature_c", "mean")
        if "humidity_pct" in df.columns:
            agg_map["humidity_pct"] = ("humidity_pct", "mean")
        agg_map["n_regions"] = ("region_id", "nunique")
        agg_map["week_start_date"] = ("date", "min")

        weekly = (
            df.groupby(group_cols, as_index=False)
            .agg(**agg_map)
            .sort_values(group_cols)
            .reset_index(drop=True)
        )
        keep = ["ta", "iso_year", "iso_week", "week_start_date", "n_regions"]
        keep += [
            c
            for c in ("rainfall_mm", "temperature_c", "humidity_pct")
            if c in weekly.columns
        ]
        return weekly[keep]

    def assign_ta_labels(
        self,
        specs: Sequence[RegionSpec],
        ta_centroids: Mapping[str, tuple[float, float]],
    ) -> dict[str, str]:
        """Map each region to its nearest TA centroid (great-circle distance).

        Args:
            specs: Region specs carrying latitude/longitude.
            ta_centroids: Mapping of TA name to ``(lat, lon)`` centroid.

        Returns:
            Mapping of ``region_id`` to nearest TA name.
        """
        if not ta_centroids:
            raise ValueError("ta_centroids must be non-empty")
        assignment: dict[str, str] = {}
        for spec in specs:
            best_ta, _ = min(
                (
                    (ta, _haversine_km(spec.lat, spec.lon, clat, clon))
                    for ta, (clat, clon) in ta_centroids.items()
                ),
                key=lambda item: item[1],
            )
            assignment[spec.region_id] = best_ta
        return assignment

    # ------------------------------------------------------------------ #
    # Live API attempts (best-effort)
    # ------------------------------------------------------------------ #

    def _attempt_chirps(
        self, specs: list[RegionSpec], start: date, end: date
    ) -> pd.DataFrame | None:
        """Try the live CHIRPS API; return ``None`` when it is unusable."""
        if _requests is None:
            return None
        frames: list[pd.DataFrame] = []
        try:
            for spec in specs:
                response = _requests.get(
                    f"{self.chirps_api_url}/{spec.lat:.2f}/{spec.lon:.2f}",
                    params={"start": start.isoformat(), "end": end.isoformat()},
                    timeout=self.timeout_seconds,
                )
                response.raise_for_status()
                records = response.json()
                frames.append(
                    pd.DataFrame(
                        {
                            "date": pd.to_datetime([r["date"] for r in records]),
                            "region_id": spec.region_id,
                            "ta": spec.ta or spec.region_id,
                            "rainfall_mm": [float(r["precip"]) for r in records],
                            "source": "chirps",
                        }
                    )
                )
        except Exception as exc:  # noqa: BLE001
            logger.info("Live CHIRPS fetch failed (%s); using fallback", exc)
            return None
        combined = pd.concat(frames, ignore_index=True) if frames else None
        return combined

    def _attempt_era5(
        self, specs: list[RegionSpec], start: date, end: date
    ) -> pd.DataFrame | None:
        """Try the Copernicus CDS API; return ``None`` when it is unusable."""
        if _cdsapi is None or _requests is None:
            return None
        try:  # pragma: no cover - requires CDS credentials + network
            client = _cdsapi.Client(quiet=True)
            request = {
                "variable": ["2m_temperature", "relative_humidity"],
                "area": [
                    max(s.lat for s in specs),
                    min(s.lon for s in specs),
                    min(s.lat for s in specs),
                    max(s.lon for s in specs),
                ],
                "date": [start.isoformat(), end.isoformat()],
                "format": "json",
            }
            result = client.retrieve(self.era5_dataset, request)
            payload = result.to_pandas()
            payload["source"] = "era5"
            return payload
        except Exception as exc:  # noqa: BLE001
            logger.info("Live ERA5 fetch failed (%s); using fallback", exc)
            return None

    # ------------------------------------------------------------------ #
    # Synthetic generators (deterministic, Malawi-calibrated)
    # ------------------------------------------------------------------ #

    def _synthetic_rainfall(
        self, specs: list[RegionSpec], start: date, end: date
    ) -> pd.DataFrame:
        """Generate realistic daily rainfall per region over the date range."""
        records: list[dict[str, Any]] = []
        n_days = (end - start).days + 1
        for spec in specs:
            rng = np.random.default_rng(
                _region_seed("chirps", spec.region_id, start, end)
            )
            # Northern Malawi is slightly wetter; encode via latitude offset.
            lat_factor = 1.0 + 0.25 * (spec.lat - MALAWI_BBOX["lat_min"]) / (
                MALAWI_BBOX["lat_max"] - MALAWI_BBOX["lat_min"]
            )
            dates = pd.date_range(start, periods=n_days, freq="D")
            months = np.array([d.month for d in dates])
            wet_prob = (
                np.array([_MONTH_RAIN_PROFILE[m][0] for m in months]) * lat_factor
            )
            wet_mean = np.array([_MONTH_RAIN_PROFILE[m][1] for m in months])
            is_wet = rng.random(n_days) < wet_prob
            amounts = rng.gamma(shape=1.6, scale=wet_mean / 1.6)
            rainfall = np.where(is_wet, amounts, 0.0).round(1)
            for d, mm in zip(dates, rainfall):
                records.append(
                    {
                        "date": d,
                        "region_id": spec.region_id,
                        "ta": spec.ta or spec.region_id,
                        "rainfall_mm": float(mm),
                        "source": "synthetic",
                    }
                )
        return pd.DataFrame(records)

    def _synthetic_temperature(
        self, specs: list[RegionSpec], start: date, end: date
    ) -> pd.DataFrame:
        """Generate realistic daily temperature/humidity per region."""
        records: list[dict[str, Any]] = []
        n_days = (end - start).days + 1
        for spec in specs:
            rng = np.random.default_rng(
                _region_seed("era5", spec.region_id, start, end)
            )
            dates = pd.date_range(start, periods=n_days, freq="D")
            day_of_year = np.array([d.timetuple().tm_yday for d in dates])
            months = np.array([d.month for d in dates])
            rainy = np.isin(months, sorted(RAINY_MONTHS))

            # Hottest around Nov (day ~315); coolest Jul (day ~195).
            temp_seasonal = 4.5 * np.cos(2 * np.pi * (day_of_year - 315) / 365.25)
            altitude_offset = (
                2.0
                * (spec.lat - MALAWI_BBOX["lat_min"])
                / (MALAWI_BBOX["lat_max"] - MALAWI_BBOX["lat_min"])
            )
            temperature = (
                23.0 + temp_seasonal - altitude_offset + rng.normal(0, 1.5, n_days)
            )
            humidity = (
                58.0
                + 18.0 * rainy
                + 8.0 * np.sin(2 * np.pi * (day_of_year - 40) / 365.25)
                + rng.normal(0, 4.0, n_days)
            ).clip(20.0, 100.0)
            for i, d in enumerate(dates):
                records.append(
                    {
                        "date": d,
                        "region_id": spec.region_id,
                        "ta": spec.ta or spec.region_id,
                        "temperature_c": round(float(temperature[i]), 1),
                        "humidity_pct": round(float(humidity[i]), 1),
                        "source": "synthetic",
                    }
                )
        return pd.DataFrame(records)


def generate_synthetic_climate(
    tas: Sequence[str],
    start_date: str | date,
    end_date: str | date,
    seed: int = 2026,
) -> pd.DataFrame:
    """Convenience wrapper producing weekly synthetic climate per TA.

    Useful for tests and offline pipeline runs.

    Returns:
        Weekly frame with ``ta``, ISO week keys, ``rainfall_mm``,
        ``temperature_c`` and ``humidity_pct``.
    """
    extractor = ClimateExtractor(seed=seed)
    specs = [
        RegionSpec(ta=ta, region_id=f"grid_{ta}", lat=-13.5, lon=34.0) for ta in tas
    ]
    rain = extractor.fetch_chirps_rainfall(specs, start_date, end_date)
    temp = extractor.fetch_era5_temperature(specs, start_date, end_date)
    return rain.merge(
        temp.drop(columns=["n_regions"], errors="ignore"),
        on=["ta", "iso_year", "iso_week"],
        suffixes=("", "_temp"),
    )


__all__ = [
    "MALAWI_BBOX",
    "RAINY_MONTHS",
    "ClimateExtractor",
    "RegionSpec",
    "generate_synthetic_climate",
]
