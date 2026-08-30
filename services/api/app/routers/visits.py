from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import actor_user_id, require_role, scoped_db
from app.models.child import Child
from app.models.household import Household
from app.models.pregnancy import Pregnancy
from app.models.visit import Visit
from app.privacy import MODEL_VERSION, cloud_gps
from app.schemas.visit import VisitCreate, VisitResponse
from app.sync.engine import token_chw_id

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


def _valid_chw_id(value: str) -> bool:
    # chw_id columns are UUIDs; a malformed path segment can never reference a
    # CHW, so answer with the empty contract instead of letting asyncpg 500.
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True


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


@router.post("/visits", response_model=VisitResponse)
async def create_visit(
    body: VisitCreate,
    response: Response,
    db: AsyncSession = Depends(scoped_db("chw", "supervisor")),
    user: dict = Depends(require_role("chw", "supervisor")),
):
    chw_id = token_chw_id(user, body.chw_id) or actor_user_id(user)
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
    db: AsyncSession = Depends(scoped_db("*")),
    user: dict = Depends(require_role("*")),
):
    if not _valid_chw_id(chw_id):
        return {"visits": []}
    households_result = await db.execute(
        select(Household).where(Household.chw_id == chw_id)
    )
    households = {row.household_id: row for row in households_result.scalars().all()}
    household_ids = set(households)

    items: list[dict] = []
    if household_ids:
        pregnancies_result = await db.execute(
            select(Pregnancy).where(
                Pregnancy.household_id.in_(household_ids),
                Pregnancy.is_active.is_(True),
            )
        )
        for pregnancy in pregnancies_result.scalars().all():
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

        children_result = await db.execute(
            select(Child).where(Child.household_id.in_(household_ids))
        )
        for child in children_result.scalars().all():
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
    db: AsyncSession = Depends(scoped_db("*")),
    user: dict = Depends(require_role("*")),
):
    """CHW/supervisor review queue: overrides are the primary model-improvement labels."""
    include_notes = user.get("role") == "chw"

    if not _valid_chw_id(chw_id):
        return {"overrides": []}
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


@router.get("/chw/performance")
async def get_chw_performance(
    district: str | None = None,
    db: AsyncSession = Depends(scoped_db("dho", "mohp", "supervisor")),
    user: dict = Depends(require_role("dho", "mohp", "supervisor")),
):
    """CHW performance metrics for DHO/MoHP dashboards.

    Returns the full CHWPerformance contract: catchment size, weekly
    visit completion, open referrals, high-risk cases, and last sync.
    """
    rows = (await db.execute(text("""
        SELECT u.user_id::text            AS chw_id,
               u.full_name                AS chw_name,
               COALESCE(hh.hh_count, 0)   AS household_count,
               COALESCE(hh.catchment_pop, 0) AS catchment_population,
               COALESCE(v.visits_week, 0) AS visits_this_week,
               v.last_visit               AS last_visit,
               COALESCE(r.open_refs, 0)   AS referrals_open,
               COALESCE(hr.high_risk, 0)  AS high_risk_cases
        FROM users u
        LEFT JOIN (
            SELECT chw_id,
                   COUNT(*)                          AS hh_count,
                   SUM(COALESCE(household_size, 1))  AS catchment_pop
            FROM households GROUP BY chw_id
        ) hh ON hh.chw_id = u.user_id
        LEFT JOIN (
            SELECT chw_id,
                   COUNT(*) FILTER (WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days') AS visits_week,
                   MAX(visit_date) AS last_visit
            FROM visits GROUP BY chw_id
        ) v ON v.chw_id = u.user_id
        LEFT JOIN (
            SELECT chw_id, COUNT(*) AS open_refs
            FROM referrals WHERE status = 'pending' GROUP BY chw_id
        ) r ON r.chw_id = u.user_id
        LEFT JOIN (
            SELECT h.chw_id, COUNT(DISTINCT c.child_id) AS high_risk
            FROM children c
            JOIN households h ON h.household_id = c.household_id
            WHERE c.risk_category IN ('medium', 'high')
            GROUP BY h.chw_id
        ) hr ON hr.chw_id = u.user_id
        WHERE u.role = 'chw' AND u.is_active = TRUE
          AND (CAST(:district AS uuid) IS NULL OR u.district_id = CAST(:district AS uuid))
        ORDER BY u.full_name
    """), {"district": district})).mappings().all()

    perf_list = []
    for r in rows:
        household_count = int(r["household_count"] or 0)
        last_visit = r["last_visit"]
        perf_list.append({
            "chw_id": r["chw_id"],
            "chw_name": r["chw_name"],
            "catchment_population": int(r["catchment_population"] or 0),
            # One catchment visit per household per week is the protocol target.
            "visits_this_week": int(r["visits_this_week"] or 0),
            "expected_visits_weekly": max(household_count, 1),
            "high_risk_cases": int(r["high_risk_cases"] or 0),
            "referrals_open": int(r["referrals_open"] or 0),
            "last_sync_at": (last_visit or datetime.now(timezone.utc)).isoformat(),
        })

    return {"chws": perf_list}


@router.get("/chw/{chw_id}/households")
async def get_chw_households(
    chw_id: str,
    db: AsyncSession = Depends(scoped_db("*")),
    user: dict = Depends(require_role("*")),
):
    """Households assigned to a CHW, in the dashboard's Household contract.

    members / under_five / high_risk / last_visit_at are derived from
    child and visit records; head_of_household falls back to the village
    label because the schema has no household-head column.
    """
    if not _valid_chw_id(chw_id):
        return {"households": []}
    # Raw SQL bypasses the session row filter, so identity is bound from
    # the token here rather than taken from the path.
    chw_id = token_chw_id(user, chw_id) or chw_id

    rows = (await db.execute(text("""
        SELECT h.household_id::text     AS household_id,
               COALESCE(h.village_name, 'Unnamed village') AS head_of_household,
               h.village_name, h.ta_name,
               COALESCE(h.household_size, 1)               AS members,
               COUNT(DISTINCT c.child_id) FILTER (
                   WHERE c.dob IS NOT NULL
                     AND c.dob > CURRENT_DATE - INTERVAL '5 years'
               )                                            AS under_five,
               BOOL_OR(c.risk_category IN ('high', 'medium')) AS high_risk,
               MAX(v.visit_date)                            AS last_visit_at,
               h.water_source, h.sanitation_type,
               h.food_security_score, h.distance_to_facility_km,
               h.gps_lat, h.gps_lon
        FROM households h
        LEFT JOIN children c ON c.household_id = h.household_id
        LEFT JOIN visits v ON v.household_id = h.household_id
        WHERE h.chw_id = :chw_id
        GROUP BY h.household_id, h.village_name, h.ta_name, h.household_size,
                 h.water_source, h.sanitation_type, h.food_security_score,
                 h.distance_to_facility_km, h.gps_lat, h.gps_lon
        ORDER BY h.village_name NULLS LAST
    """), {"chw_id": chw_id})).mappings().all()

    def _iso(dt):
        return dt.isoformat() if dt else None

    return {
        "households": [
            {
                "household_id": r["household_id"],
                "head_of_household": r["head_of_household"],
                "members": int(r["members"] or 1),
                "under_five": int(r["under_five"] or 0),
                "high_risk": bool(r["high_risk"]),
                "last_visit_at": _iso(r["last_visit_at"]),
                "village_name": r["village_name"],
                "ta_name": r["ta_name"],
                "household_size": int(r["members"] or 1),
                "water_source": r["water_source"],
                "sanitation_type": r["sanitation_type"],
                "food_security_score": r["food_security_score"],
                "distance_to_facility_km": r["distance_to_facility_km"],
                "gps_lat": r["gps_lat"],
                "gps_lon": r["gps_lon"],
            }
            for r in rows
        ]
    }


@router.post("/chuma/budget-model")
async def run_budget_model(
    body: dict,
    user: dict = Depends(require_role("dho", "mohp")),
):
    """CHUMA budget scenario model — placeholder for ML integration."""
    scenario = body.get("scenario", "baseline")
    district = body.get("district_id")
    return {
        "scenario": scenario,
        "district_id": district,
        "projected_budget_mwk": 450_000_000,
        "recommended_allocations": [
            {"category": "ACTs", "amount_mwk": 120_000_000, "rationale": "Malaria peak season"},
            {"category": "RDTs", "amount_mwk": 45_000_000, "rationale": "Diagnostic capacity"},
            {"category": "Maternity supplies", "amount_mwk": 80_000_000, "rationale": "High maternal mortality"},
        ],
        "executive_summary": f"Budget scenario '{scenario}' for {district or 'national'} level.",
    }
