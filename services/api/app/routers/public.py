from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.knowledge import SelfCareGuide

router = APIRouter(prefix="/api/v1/public", tags=["public"])

# Derive district risk from live alert severity like national.py: districts
# with no active alerts have no risk level (null), never a fabricated one.
_SEVERITY_TO_RISK = {3: "high", 2: "medium", 1: "low"}

# No auth on this seam; it serves ONLY aggregate + approved-public content.
# Every payload here is deliberately narrower than the internal routers:
# no households, no individuals, no internal workflow fields.

_PUBLIC_CACHE_TTL = 120


class _TTLCache:
    def __init__(self, ttl: int) -> None:
        self.ttl = ttl
        self._store: dict[str, tuple[float, Any]] = {}

    async def get_or(self, key: str, producer):
        now = time.time()
        hit = self._store.get(key)
        if hit is not None and now - hit[0] < self.ttl:
            return hit[1]
        value = await producer()
        self._store[key] = (now, value)
        return value


_cache = _TTLCache(_PUBLIC_CACHE_TTL)


def _public_guide(guide: SelfCareGuide) -> dict:
    """Dual-language, family-facing guide payload.

    Only fields a reader needs are exposed; workflow fields (reviewed_by,
    reviewer notes, study linkage) stay internal.
    """
    return {
        "guide_id": guide.guide_id,
        "title": guide.title,
        "title_chichewa": guide.title_chichewa,
        "category": guide.category,
        "audience": guide.audience,
        "severity": guide.severity,
        "what_it_is": guide.what_it_is,
        "what_it_is_chichewa": guide.what_it_is_chichewa,
        "what_to_do_now": guide.what_to_do_now or [],
        "what_to_do_now_chichewa": guide.what_to_do_now_chichewa or [],
        "what_not_to_do": guide.what_not_to_do or [],
        "what_not_to_do_chichewa": guide.what_not_to_do_chichewa or [],
        "when_to_seek_help": guide.when_to_seek_help,
        "when_to_seek_help_chichewa": guide.when_to_seek_help_chichewa,
        "prevention": guide.prevention or [],
        "prevention_chichewa": guide.prevention_chichewa or [],
        "illustration_url": guide.illustration_url,
        "audio_url": guide.audio_url,
        "updated_at": guide.updated_at,
    }


@router.get("/guides")
async def list_public_guides(
    category: str | None = Query(default=None),
    severity: str | None = Query(default=None, pattern="^(info|warning|emergency)$"),
    db: AsyncSession = Depends(get_db),
):
    """Active, family-approved self-care guides (no internal workflow rows)."""
    stmt = (
        select(SelfCareGuide)
        .where(SelfCareGuide.is_active.is_(True))
        .order_by(
            SelfCareGuide.severity.desc(),
            SelfCareGuide.category.asc(),
            SelfCareGuide.title.asc(),
        )
    )
    if category:
        stmt = stmt.where(SelfCareGuide.category == category)
    if severity:
        stmt = stmt.where(SelfCareGuide.severity == severity)
    result = await db.execute(stmt)
    guides = [_public_guide(g) for g in result.scalars().unique().all()]
    return {"guides": guides, "source": "public-guides"}


@router.get("/guides/{guide_id}")
async def get_public_guide(guide_id: str, db: AsyncSession = Depends(get_db)):
    """One public guide; 404 for anything not approved for public reading."""
    result = await db.execute(
        select(SelfCareGuide).where(
            SelfCareGuide.guide_id == guide_id, SelfCareGuide.is_active.is_(True)
        )
    )
    guide = result.scalars().first()
    if guide is None:
        raise HTTPException(status_code=404, detail="guide not found")
    return {"guide": _public_guide(guide), "source": "public-guides"}


@router.get("/districts")
async def public_districts(db: AsyncSession = Depends(get_db)):
    """Aggregate district risk and facility counts — no row-level data.

    Risk level comes from the highest active alert per district; districts
    without an active alert report ``risk_level: null``.
    """

    async def _produce() -> dict:
        result = await db.execute(
            text(
                """
                SELECT
                    d.district_id::text AS district_id,
                    d.name AS district_name,
                    d.region AS region,
                    COUNT(DISTINCT f.facility_id) AS facility_count,
                    COUNT(DISTINCT al.alert_id) FILTER (
                        WHERE al.status <> 'resolved'
                    ) AS active_alerts,
                    COALESCE(
                        MAX(CASE
                            WHEN al.status <> 'resolved' AND al.alert_level = 'red' THEN 3
                            WHEN al.status <> 'resolved' AND al.alert_level = 'yellow' THEN 2
                            WHEN al.status <> 'resolved' AND al.alert_level = 'green' THEN 1
                        END),
                        0
                    ) AS _max_sev
                FROM districts d
                LEFT JOIN facilities f
                    ON f.district_id = d.district_id AND f.is_active = TRUE
                LEFT JOIN alerts al
                    ON al.district_id = d.district_id
                GROUP BY d.district_id, d.name, d.region
                ORDER BY d.name
                """
            )
        )
        districts = []
        for r in result.mappings():
            d = dict(r)
            districts.append(
                {
                    "district_id": d["district_id"],
                    "district_name": d["district_name"],
                    "region": d.get("region"),
                    "facility_count": int(d["facility_count"] or 0),
                    "risk_level": _SEVERITY_TO_RISK.get(d["_max_sev"]),
                    "active_alerts": int(d["active_alerts"] or 0),
                }
            )
        return {
            "districts": districts,
            "source": "public-districts",
            "cached_at": time.time(),
        }

    return await _cache.get_or("districts", _produce)


@router.get("/facilities")
async def public_facilities(
    district_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Public facility directory — name, type, location, key services."""
    sql = """
        SELECT
            f.facility_id::text AS facility_id,
            f.name AS name,
            f.facility_type AS facility_type,
            f.latitude AS latitude,
            f.longitude AS longitude,
            f.has_maternity AS has_maternity,
            f.has_lab AS has_lab,
            f.has_pharmacy AS has_pharmacy,
            f.catchment_population AS catchment_population,
            d.name AS district_name
        FROM facilities f
        LEFT JOIN districts d ON d.district_id = f.district_id
        WHERE f.is_active = TRUE
    """
    params: dict[str, Any] = {}
    if district_id:
        sql += " AND f.district_id::text = :district_id"
        params["district_id"] = district_id
    sql += " ORDER BY d.name ASC, f.name ASC"
    result = await db.execute(text(sql), params)
    facilities = [dict(r) for r in result.mappings()]
    return {"facilities": facilities, "source": "public-facilities"}
