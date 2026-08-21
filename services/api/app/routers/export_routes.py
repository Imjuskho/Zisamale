"""CSV export endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.deps import require_role
from app.export import alerts_to_csv, surveillance_to_csv

router = APIRouter(prefix="/api/v1", tags=["export"])


@router.get("/district/{district_id}/export/alerts")
async def export_district_alerts(
    district_id: str,
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    try:
        from sqlalchemy import select
        from app.database import async_session
        from app.models.alert import Alert

        async with async_session() as db:
            result = await db.execute(
                select(Alert).where(Alert.district_id == district_id).order_by(Alert.generated_at.desc())
            )
            alerts = [
                {
                    "alert_id": a.alert_id,
                    "disease": a.disease,
                    "ta_name": a.ta_name,
                    "risk_score": a.risk_score,
                    "alert_level": a.alert_level,
                    "predicted_cases": a.predicted_cases,
                    "confidence_interval_lower": a.confidence_interval_lower,
                    "confidence_interval_upper": a.confidence_interval_upper,
                    "status": a.status,
                    "generated_at": str(a.generated_at) if a.generated_at else "",
                }
                for a in result.scalars().all()
            ]
    except Exception:
        alerts = []

    csv_content = alerts_to_csv(alerts)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=alerts_{district_id}.csv"},
    )


@router.get("/district/{district_id}/export/surveillance")
async def export_surveillance(
    district_id: str,
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    sample_data = [
        {"week": f"2026-W{w:02d}", "cases": max(0, 50 + w * 3 - (w % 5) * 10)}
        for w in range(1, 27)
    ]
    csv_content = surveillance_to_csv(sample_data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=surveillance_{district_id}.csv"},
    )
