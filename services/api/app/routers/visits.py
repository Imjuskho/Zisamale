from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import actor_user_id, assert_chw_scope, get_current_user, require_role
from app.models.child import Child
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.visit import Visit
from app.privacy import MODEL_VERSION, cloud_gps
from app.schemas.visit import VisitCreate, VisitResponse

router = APIRouter(prefix="/api/v1", tags=["visits"])

RISK_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
FOLLOWUP_DAYS = {"critical": 1, "high": 3, "medium": 7, "low": 14}


def _parse_visit_date(raw: str) -> datetime:
    value = raw.strip()
    if value.isdigit():
        ts = int(value)
        if ts > 10_000_000_000:
            ts = ts / 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid visit_date: {raw}",
        ) from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return []


def _overdue_days(next_visit) -> int:
    if next_visit is None:
        return 0
    if isinstance(next_visit, datetime):
        due = next_visit.date()
    elif isinstance(next_visit, date):
        due = next_visit
    else:
        try:
            due = date.fromisoformat(str(next_visit)[:10])
        except ValueError:
            return 0
    return max((date.today() - due).days, 0)


def _next_visit_recommendation(visit_at: datetime, risk_category: str | None) -> dict:
    days = FOLLOWUP_DAYS.get(risk_category or "medium", 7)
    suggested = (visit_at.astimezone(timezone.utc) + timedelta(days=days)).date().isoformat()
    return {"visit_type": "followup", "suggested_date": suggested}


def _risk_score_from_body(body: VisitCreate) -> float | None:
    if body.ai_risk_score is not None:
        return body.ai_risk_score
    if isinstance(body.ai_recommendation, dict):
        score = body.ai_recommendation.get("risk_score")
        if score is not None:
            return float(score)
    return None


def _risk_category_from_body(body: VisitCreate) -> str | None:
    if isinstance(body.ai_recommendation, dict):
        category = body.ai_recommendation.get("risk_category")
        if isinstance(category, str):
            return category
    return None


def _bound_chw_id(user: dict, requested: str | None) -> str:
    user_id = actor_user_id(user)
    if user.get("role") == "chw":
        return user_id
    return requested or user_id


@router.post("/visits", response_model=VisitResponse)
async def create_visit(
    body: VisitCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    chw_id = _bound_chw_id(user, body.chw_id)
    visit_id = body.visit_id or str(uuid.uuid4())
    visit_at = _parse_visit_date(body.visit_date)
    visit_at_naive = visit_at.replace(tzinfo=None) if visit_at.tzinfo else visit_at

    existing_result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.household_id != body.household_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="visit_id already exists with a different household",
            )
        response.status_code = status.HTTP_200_OK
        category = _risk_category_from_body(body)
        return VisitResponse(
            visit_id=existing.visit_id,
            sync_status=existing.sync_status or "synced",
            created=False,
            next_visit_recommendation=_next_visit_recommendation(visit_at, category),
        )

    gps_lat, gps_lon = cloud_gps(body.gps_lat, body.gps_lon)
    recommendation = body.ai_recommendation
    if isinstance(recommendation, dict) and "model_version" not in recommendation:
        recommendation = {**recommendation, "model_version": MODEL_VERSION}

    visit = Visit(
        visit_id=visit_id,
        household_id=body.household_id,
        chw_id=chw_id,
        visit_date=visit_at_naive,
        pregnancy_id=body.pregnancy_id,
        child_id=body.child_id,
        visit_type=body.visit_type,
        symptoms=body.symptoms,
        danger_signs=body.danger_signs,
        measurements=body.measurements,
        ai_recommendation=recommendation,
        ai_risk_score=_risk_score_from_body(body),
        chw_override=body.chw_override,
        chw_override_reason=body.chw_override_reason,
        chw_notes=body.chw_notes,
        gps_lat=gps_lat,
        gps_lon=gps_lon,
        photos_queued=len(body.photos),
        sync_status="synced",
    )
    db.add(visit)
    await db.flush()

    response.status_code = status.HTTP_201_CREATED
    return VisitResponse(
        visit_id=visit.visit_id,
        sync_status="synced",
        created=True,
        next_visit_recommendation=_next_visit_recommendation(
            visit_at, _risk_category_from_body(body)
        ),
    )


@router.get("/chw/{chw_id}/priority-list")
async def get_priority_list(
    chw_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    assert_chw_scope(user, chw_id)

    households_result = await db.execute(
        select(Household).where(Household.chw_id == chw_id)
    )
    households = {row.household_id: row for row in households_result.scalars().all()}
    household_ids = set(households)

    items: list[dict] = []
    if household_ids:
        pregnancies_result = await db.execute(select(Pregnancy))
        for pregnancy in pregnancies_result.scalars().all():
            if pregnancy.household_id not in household_ids:
                continue
            if pregnancy.is_active is False:
                continue
            household = households.get(pregnancy.household_id)
            items.append(
                {
                    "household_id": pregnancy.household_id,
                    "household_name": pregnancy.woman_name
                    or (household.village_name if household else None)
                    or pregnancy.household_id,
                    "visit_type": "pregnancy",
                    "risk_score": float(pregnancy.risk_score or 0),
                    "risk_category": pregnancy.risk_category or "low",
                    "due_date": str(pregnancy.next_visit_date) if pregnancy.next_visit_date else None,
                    "overdue_days": _overdue_days(pregnancy.next_visit_date),
                    "top_risk_factors": _as_list(pregnancy.top_risk_factors),
                    "distance_km": float(household.distance_to_facility_km or 0)
                    if household
                    else 0.0,
                }
            )

        children_result = await db.execute(select(Child))
        for child in children_result.scalars().all():
            if child.household_id not in household_ids:
                continue
            household = households.get(child.household_id)
            items.append(
                {
                    "household_id": child.household_id,
                    "household_name": child.child_name
                    or (household.village_name if household else None)
                    or child.household_id,
                    "visit_type": "child",
                    "risk_score": float(child.risk_score or 0),
                    "risk_category": child.risk_category or "low",
                    "due_date": None,
                    "overdue_days": 0,
                    "top_risk_factors": _as_list(child.top_risk_factors),
                    "distance_km": float(household.distance_to_facility_km or 0)
                    if household
                    else 0.0,
                }
            )

    items.sort(
        key=lambda item: (
            -item["overdue_days"],
            RISK_RANK.get(item["risk_category"], 9),
            -item["risk_score"],
        )
    )
    return {"visits": items}


@router.get("/chw/{chw_id}/overrides")
async def list_overrides(
    chw_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """CHW/supervisor review queue: overrides are the primary model-improvement labels."""
    assert_chw_scope(user, chw_id)
    include_notes = user.get("role") == "chw"

    result = await db.execute(select(Visit).where(Visit.chw_id == chw_id))
    rows = [row for row in result.scalars().all() if row.chw_override]
    rows.sort(key=lambda row: str(row.visit_date or ""), reverse=True)

    overrides = []
    for visit in rows:
        item = {
            "visit_id": visit.visit_id,
            "household_id": visit.household_id,
            "visit_type": visit.visit_type,
            "ai_risk_score": visit.ai_risk_score,
            "ai_recommendation": visit.ai_recommendation,
            "chw_override_reason": visit.chw_override_reason,
            "danger_signs": visit.danger_signs or [],
        }
        if include_notes:
            item["chw_notes"] = visit.chw_notes
        overrides.append(item)
    return {"overrides": overrides}
