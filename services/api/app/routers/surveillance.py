'''CHW-first surveillance aggregation.

Field visit data (synced opportunistically from the CHW app) is treated
as the primary surveillance signal: it is near-real-time and does not
depend on facility reporting. Every response carries ``source_meta``
so clients can render data age honestly. Comparison columns that need
integrations which are not connected yet (DHIS2 case counts) are served
as null - never fabricated.
'''

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_role

router = APIRouter(prefix="/api/v1/surveillance", tags=["surveillance"])

_FRESHNESS_BANDS = ((7, "live"), (30, "recent"), (180, "stale"))


def _freshness(last_sync_at) -> str:
    '''Band a sync timestamp: live <7d, recent <30d, stale <180d, else historic.'''
    if last_sync_at is None:
        return "historic"
    ts = last_sync_at if last_sync_at.tzinfo else last_sync_at.replace(tzinfo=timezone.utc)
    age_days = (datetime.now(timezone.utc) - ts).days
    for limit, band in _FRESHNESS_BANDS:
        if age_days < limit:
            return band
    return "historic"


def _meta(*, source: str, last_sync_at, record_count, expected_count=None) -> dict:
    '''Provenance block attached to every surveillance payload.'''
    return {
        "source": source,
        "last_sync_at": (
            last_sync_at.isoformat() if last_sync_at is not None else None
        ),
        "record_count": int(record_count or 0),
        # True denominators need reporting-expectation registries we do
        # not have yet; served as None instead of an invented ratio.
        "expected_count": expected_count,
        "freshness_score": _freshness(last_sync_at),
    }


@router.get("/chw/summary")
async def get_chw_summary(
    user: dict = Depends(require_role("mohp", "phim", "dho", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    '''This week's field signal: visits, fever clusters, danger-sign referrals.'''
    row = (
        await db.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE v.visit_date >= NOW() - INTERVAL '7 days'
                    ) AS visits_this_week,
                    COUNT(DISTINCT v.household_id) FILTER (
                        WHERE v.visit_date >= NOW() - INTERVAL '7 days'
                          AND v.symptoms @> '["fever"]'::jsonb
                    ) AS fever_clusters,
                    COUNT(*) FILTER (
                        WHERE v.visit_date >= NOW() - INTERVAL '7 days'
                          AND COALESCE(jsonb_array_length(v.danger_signs), 0) > 0
                    ) AS danger_referrals,
                    MAX(v.visit_date) AS last_sync_at
                FROM visits v
                """
            )
        )
    ).fetchone()

    trend_rows = (
        await db.execute(
            text(
                """
                SELECT date_trunc('week', v.visit_date)::date AS week_start,
                       COUNT(DISTINCT v.household_id) FILTER (
                           WHERE v.symptoms @> '["fever"]'::jsonb
                       ) AS fever_count
                FROM visits v
                WHERE v.visit_date >= NOW() - INTERVAL '28 days'
                GROUP BY 1
                ORDER BY 1
                """
            )
        )
    ).fetchall()

    m = dict(row._mapping) if row is not None else {}
    return {
        "visits_this_week": int(m.get("visits_this_week") or 0),
        "fever_clusters": int(m.get("fever_clusters") or 0),
        "danger_referrals": int(m.get("danger_referrals") or 0),
        "weekly_trend": [
            {"week": str(r.week_start), "fever": int(r.fever_count)}
            for r in trend_rows
        ],
        "source_meta": _meta(
            source="chw",
            last_sync_at=m.get("last_sync_at"),
            record_count=m.get("visits_this_week"),
        ),
    }


@router.get("/chw/heatmap")
async def get_chw_heatmap(
    user: dict = Depends(require_role("mohp", "phim", "dho", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    '''TA-level activity cells from CHW visits over the last 14 days.

    TAs with zero visits return risk_score None so clients can render
    "No data" instead of a fabricated green.'''
    result = await db.execute(
        text(
            """
            SELECT ta.ta_id::text AS ta_id,
                   ta.name AS ta_name,
                   d.name AS district_name,
                   COUNT(v.visit_id) AS visit_count,
                   COUNT(DISTINCT v.household_id) FILTER (
                       WHERE v.symptoms @> '["fever"]'::jsonb
                   ) AS fever_count,
                   COUNT(*) FILTER (
                       WHERE COALESCE(jsonb_array_length(v.danger_signs), 0) > 0
                   ) AS danger_count
            FROM traditional_authorities ta
            JOIN districts d ON d.district_id = ta.district_id
            LEFT JOIN villages vi ON vi.ta_id = ta.ta_id
            LEFT JOIN households h ON h.village_id = vi.village_id
            LEFT JOIN visits v
                ON v.household_id = h.household_id
               AND v.visit_date >= NOW() - INTERVAL '14 days'
            GROUP BY ta.ta_id, ta.name, d.name
            ORDER BY d.name, ta.name
            """
        )
    )

    cells = []
    max_visits = 0
    newest = None
    for r in result.fetchall():
        visit_count = int(r.visit_count)
        max_visits = max(max_visits, visit_count)
        if visit_count > 0:
            ratio = int(r.fever_count) / visit_count if visit_count else 0.0
            risk_score: float | None = round(min(ratio, 1.0), 3)
        else:
            risk_score = None
        cells.append(
            {
                "ta_id": r.ta_id,
                "ta_name": r.ta_name,
                "district_name": r.district_name,
                "visit_count": visit_count,
                "fever_count": int(r.fever_count),
                "danger_count": int(r.danger_count),
                "risk_score": risk_score,
            }
        )

    meta_row = (
        await db.execute(text("SELECT MAX(visit_date) AS last_sync_at FROM visits"))
    ).fetchone()
    last_sync = meta_row.last_sync_at if meta_row is not None else None
    return {
        "cells": cells,
        "max_visit_count": max_visits,
        "source_meta": _meta(
            source="chw", last_sync_at=last_sync, record_count=max_visits
        ),
    }


@router.get("/chw/overrides")
async def get_chw_overrides(
    user: dict = Depends(require_role("mohp", "phim", "dho", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    '''Override patterns grouped by reason, current 30d vs previous 30d.

    CHW override is a training signal, not a failure - this endpoint
    surfaces it so supervisors can ask why disagreement clusters.'''
    result = await db.execute(
        text(
            """
            SELECT v.chw_override_reason AS reason,
                    COUNT(*) FILTER (
                        WHERE v.visit_date >= NOW() - INTERVAL '30 days'
                    ) AS count,
                    COUNT(*) FILTER (
                        WHERE v.visit_date < NOW() - INTERVAL '30 days'
                          AND v.visit_date >= NOW() - INTERVAL '60 days'
                    ) AS prev_count,
                    COUNT(DISTINCT d.district_id) AS district_span,
                    STRING_AGG(DISTINCT d.name, ', ' ORDER BY d.name) AS districts,
                    MAX(v.visit_date) AS last_reason_sync
            FROM visits v
            LEFT JOIN households h ON h.household_id = v.household_id
            LEFT JOIN villages vi ON vi.village_id = h.village_id
            LEFT JOIN traditional_authorities ta ON ta.ta_id = vi.ta_id
            LEFT JOIN districts d ON d.district_id = ta.district_id
            WHERE v.chw_override = TRUE
              AND COALESCE(v.chw_override_reason, '') <> ''
              AND v.visit_date >= NOW() - INTERVAL '60 days'
            GROUP BY v.chw_override_reason
            ORDER BY count DESC
            LIMIT 10
            """
        )
    )

    rows = []
    newest = None
    for r in result.fetchall():
        count = int(r.count)
        prev = int(r.prev_count)
        if prev > 0:
            trend_pct: int | None = round(((count - prev) / prev) * 100)
        elif count > 0:
            trend_pct = None
        else:
            trend_pct = 0
        rows.append(
            {
                "reason_key": r.reason,
                "count": count,
                "prev_count": prev,
                "trend": trend_pct,
                "districts": (r.districts or "").split(", ") if r.districts else [],
            }
        )
        if r.last_reason_sync and (newest is None or r.last_reason_sync > newest):
            newest = r.last_reason_sync

    total = sum(r["count"] for r in rows)
    return {
        "overrides": rows,
        "source_meta": _meta(
            source="chw", last_sync_at=newest, record_count=total
        ),
    }


@router.get("/chw-vs-dhis2")
async def get_chw_vs_dhis2(
    user: dict = Depends(require_role("mohp", "phim", "dho", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    '''CHW-reported fever vs facility-reported malaria, per district.

    The DHIS2 side is null until a real integration exists; the gap
    column stays null rather than implying a number we cannot know.'''
    result = await db.execute(
        text(
            """
            SELECT d.district_id::text AS district_id,
                   d.name AS district_name,
                   COUNT(DISTINCT v.household_id) FILTER (
                       WHERE v.symptoms @> '["fever"]'::jsonb
                         AND v.visit_date >= NOW() - INTERVAL '30 days'
                   ) AS chw_fever,
                   MAX(v.visit_date) FILTER (
                       WHERE v.visit_date >= NOW() - INTERVAL '30 days'
                   ) AS last_chw_sync
            FROM districts d
            LEFT JOIN traditional_authorities ta ON ta.district_id = d.district_id
            LEFT JOIN villages vi ON vi.ta_id = ta.ta_id
            LEFT JOIN households h ON h.village_id = vi.village_id
            LEFT JOIN visits v ON v.household_id = h.household_id
            GROUP BY d.district_id, d.name
            ORDER BY d.name
            """
        )
    )

    rows = []
    newest = None
    for r in result.fetchall():
        chw_fever = int(r.chw_fever)
        rows.append(
            {
                "district_id": r.district_id,
                "district_name": r.district_name,
                "chw_fever": chw_fever,
                # Reserved until the DHIS2 integration lands.
                "dhis2_malaria": None,
                "gap": None,
            }
        )
        if r.last_chw_sync and (newest is None or r.last_chw_sync > newest):
            newest = r.last_chw_sync

    total = sum(r["chw_fever"] for r in rows)
    return {
        "rows": rows,
        "dhis2_connected": False,
        "note": (
            "DHIS2 case counts are not connected yet; comparison columns "
            "stay empty rather than showing invented numbers."
        ),
        "source_meta": _meta(
            source="chw", last_sync_at=newest, record_count=total
        ),
    }
