from __future__ import annotations

import os

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, event, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import Select as _Select

from app.auth import decode_token
from app.database import get_db

security = HTTPBearer(auto_error=False)

# Retained so existing tests can detect the pytest environment. Authentication
# always verifies a real JWT — this flag must never grant a default role.
TEST_MODE = os.getenv("ENVIRONMENT") == "testing"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload


def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        # "*" admits any authenticated role — CHWs are still pinned at the seam.
        if "*" not in roles and user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role')}' not in required roles: {roles}",
            )
        return user
    return checker


def actor_user_id(user: dict) -> str:
    return str(user.get("sub") or "")


# ── Catchment scope guard ──────────────────────────────────────────
#
# The seam between authentication and data access. A session carrying
# ``scope_chw_id`` transparently filters every ORM query against chw-scoped
# models, so tenancy stops being a per-handler responsibility. A ``chw_id``
# path parameter is validated here too: for CHW tokens it must match the
# identity inside the JWT, or the request is rejected before any query runs.


@event.listens_for(Session, "do_orm_execute")
def _apply_chw_scope(execute_state):
    scope = execute_state.session.info.get("scope_chw_id")
    if not scope or execute_state.is_column_load or execute_state.is_relationship_load:
        return
    stmt = execute_state.statement
    if not isinstance(stmt, _Select):
        return
    # Build fresh predicates per event. A value-capturing criteria lambda is
    # unsafe here: SQLAlchemy's lambda registry can reuse a stale compiled
    # form whose captured scope belongs to another CHW, silently narrowing the
    # wrong catchment. Direct WHERE injection avoids that class of bug.
    from app.models.child import Child
    from app.models.household import Household
    from app.models.pregnancy import Pregnancy
    from app.models.visit import Visit

    conditions: list[object] = []
    tables = {from_.name for from_ in stmt.get_final_froms()}
    if "households" in tables:
        conditions.append(Household.chw_id == scope)
    if "visits" in tables:
        conditions.append(Visit.chw_id == scope)
    owning_households = select(Household.household_id).where(Household.chw_id == scope)
    if "pregnancies" in tables:
        # Rows can carry the owner on the row itself (registration endpoints)
        # or only via their household (scoring/ingest write paths).
        conditions.append(
            or_(Pregnancy.chw_id == scope, Pregnancy.household_id.in_(owning_households))
        )
    if "children" in tables:
        conditions.append(
            or_(Child.chw_id == scope, Child.household_id.in_(owning_households))
        )
    if conditions:
        execute_state.statement = stmt.where(and_(*conditions))


def scoped_db(*roles: str):
    """Dependency factory: role check + automatic catchment scoping.

    CHWs get a session whose queries are restricted to their own rows, and a
    ``chw_id`` path parameter (when the route has one) must match their token
    identity — cross-catchment requests are rejected here, not per handler.
    Pass ``*`` to keep the endpoint open to any authenticated role while
    still pinning CHW sessions. Other roles see unfiltered data.
    """

    async def dependency(
        request: Request,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(require_role(*roles)),
    ) -> AsyncSession:
        if user.get("role") == "chw":
            identity = str(user.get("sub") or user.get("chw_id") or "")
            allowed = {str(v) for v in (user.get("sub"), user.get("chw_id")) if v}
            if not identity or not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token carries no catchment identity",
                )
            requested = request.path_params.get("chw_id")
            if requested is not None and str(requested) not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access another CHW's catchment",
                )
            db.sync_session.info["scope_chw_id"] = identity
        return db

    return dependency
