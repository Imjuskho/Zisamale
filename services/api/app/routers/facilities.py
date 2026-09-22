"""Facilities API — real PostGIS-backed GeoJSON endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/api/v1", tags=["facilities"])


@router.get("/facilities")
async def list_facilities(
    district: str | None = Query(None, description="Filter by district name"),
    facility_type: str | None = Query(None, description="Filter by type"),
    limit: int = Query(2000, le=5000),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Return facilities as GeoJSON FeatureCollection for Leaflet.
    Reads real data from PostgreSQL/PostGIS.
    """
    conditions = ["f.is_active = TRUE"]
    params: dict[str, str | int] = {"limit": limit}

    if district:
        conditions.append("d.name = :district")
        params["district"] = district
    if facility_type:
        conditions.append("f.facility_type = :ftype")
        params["ftype"] = facility_type

    where_clause = " AND ".join(conditions)

    query = text(f"""
        SELECT
            f.facility_id,
            f.name,
            f.facility_type,
            f.latitude,
            f.longitude,
            f.bed_count,
            f.has_maternity,
            f.has_lab,
            f.has_pharmacy,
            f.is_active,
            d.name as district_name
        FROM facilities f
        LEFT JOIN districts d ON f.district_id = d.district_id
        WHERE {where_clause}
        ORDER BY f.name
        LIMIT :limit
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()

    features = []
    for row in rows:
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row.longitude, row.latitude],
                },
                "properties": {
                    "id": str(row.facility_id),
                    "name": row.name,
                    "type": row.facility_type,
                    "district": row.district_name,
                    "beds_total": row.bed_count,
                    "has_maternity": row.has_maternity,
                    "has_lab": row.has_lab,
                    "has_pharmacy": row.has_pharmacy,
                    "is_active": row.is_active,
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "count": len(features),
            "district": district,
            "facility_type": facility_type,
        },
    }


@router.get("/facilities/stats")
async def facility_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Aggregate facility statistics for dashboards."""
    query = text("""
        SELECT
            f.facility_type,
            d.name as district_name,
            COUNT(*) as count,
            SUM(f.bed_count) as total_beds,
            SUM(CASE WHEN f.has_maternity THEN 1 ELSE 0 END) as maternity_count,
            SUM(CASE WHEN f.has_lab THEN 1 ELSE 0 END) as lab_count
        FROM facilities f
        LEFT JOIN districts d ON f.district_id = d.district_id
        WHERE f.is_active = TRUE
        GROUP BY f.facility_type, d.name
        ORDER BY d.name, f.facility_type
    """)

    result = await db.execute(query)
    rows = result.fetchall()

    return {
        "stats": [
            {
                "district": row.district_name,
                "type": row.facility_type,
                "count": row.count,
                "total_beds": row.total_beds or 0,
                "maternity_count": row.maternity_count or 0,
                "lab_count": row.lab_count or 0,
            }
            for row in rows
        ]
    }
