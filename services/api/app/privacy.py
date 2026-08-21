"""Privacy helpers applied at the cloud sync boundary (ADR-005)."""

from __future__ import annotations

# Two decimal degrees is roughly 1.1 km at the equator — TA-scale, not household.
GPS_DECIMAL_PLACES = 2

MODEL_VERSION = "rule-based-v1"


def coarsen_coordinate(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), GPS_DECIMAL_PLACES)


def cloud_gps(lat: float | None, lon: float | None) -> tuple[float | None, float | None]:
    return coarsen_coordinate(lat), coarsen_coordinate(lon)
