from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.alert import Alert
from app.models.surveillance import SurveillanceWeekly
from app.schemas.alert import AlertResponse, AlertRespond

router = APIRouter(prefix="/api/v1", tags=["alerts"])


@router.get("/district/{district_id}/alerts")
async def get_district_alerts(
    district_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.district_id == district_id)
        .where(Alert.status != "resolved")
        .order_by(Alert.risk_score.desc())
    )
    alerts = result.scalars().all()

    if not alerts:
        return {"alerts": []}

    return {
        "alerts": [
            AlertResponse(
                alert_id=a.alert_id,
                disease=a.disease,
                ta_name=a.ta_name or "",
                risk_score=a.risk_score or 0.0,
                alert_level=a.alert_level,
                predicted_cases=a.predicted_cases or 0,
                confidence_interval=[
                    a.confidence_interval_lower or 0,
                    a.confidence_interval_upper or 0,
                ],
                generated_at=str(a.generated_at) if a.generated_at else "",
                valid_until=str(a.valid_until) if a.valid_until else None,
                recommended_actions=a.recommended_actions or [],
                response_status=a.status,
                responded_by=a.responded_by,
                response_notes=a.response_notes,
            ).model_dump()
            for a in alerts
        ]
    }


@router.post("/alerts/{alert_id}/respond")
async def respond_to_alert(
    alert_id: str,
    body: AlertRespond,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "supervisor")),
):
    result = await db.execute(select(Alert).where(Alert.alert_id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = body.response_status
    alert.responded_by = body.responded_by
    alert.response_notes = body.notes
    alert.actions_taken = body.actions_taken
    alert.resources_deployed = body.resources_deployed
    alert.responded_at = datetime.now(timezone.utc)

    return {"status": "updated", "alert_id": alert_id}


@router.get("/district/{district_id}/surveillance/trends")
async def get_surveillance_trends(
    district_id: str,
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    actual: list[dict] = []
    try:
        from app.database import async_session

        async with async_session() as db:
            result = await db.execute(select(SurveillanceWeekly))
            rows = [
                row
                for row in result.scalars().all()
                if row.district_id == district_id
            ]
        malaria = [row for row in rows if row.disease == "malaria"]
        series = malaria or rows
        series.sort(key=lambda row: (row.year or 0, row.week_number or 0))
        actual = [
            {"week": row.epidemiological_week, "cases": row.confirmed_cases or 0}
            for row in series
        ]
    except Exception:
        actual = []

    return {
        "actual_cases": actual,
        "predicted_cases": [],
        "model_accuracy": None,
        "source": "dhis2" if actual else "none",
    }
