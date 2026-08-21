"""Role-based access control matrix for Zisamale roles.

Permission levels encode both the breadth of data a role may touch and the
actions it may perform. ``check_permission`` maps (role, resource, action)
onto the matrix; scope enforcement within an allowed level (e.g. which
district) remains the caller's responsibility.
"""

from __future__ import annotations

from fastapi import HTTPException, status

RBAC_MATRIX = {
    "chw": {"patient_data": "own_catchment", "alerts": "view", "dashboard": "none"},
    "supervisor": {
        "patient_data": "district",
        "alerts": "acknowledge",
        "dashboard": "district",
    },
    "dho": {
        "patient_data": "district",
        "alerts": "full",
        "dashboard": "full",
    },
    "phim": {
        "patient_data": "national_aggregate",
        "alerts": "full",
        "dashboard": "full",
        "ml_models": "audit",
    },
    "mohp": {
        "patient_data": "national_aggregate",
        "alerts": "view",
        "dashboard": "full",
        "admin": "full",
    },
    "ml_engineer": {"patient_data": "deidentified", "ml_models": "full"},
}

_LEVEL_ACTIONS: dict[str, frozenset[str]] = {
    "none": frozenset(),
    "view": frozenset({"view", "read"}),
    "acknowledge": frozenset({"view", "read", "acknowledge"}),
    "audit": frozenset({"view", "read", "audit"}),
    "own_catchment": frozenset({"view", "read", "write"}),
    "district": frozenset({"view", "read", "aggregate"}),
    "national_aggregate": frozenset({"view", "read", "aggregate"}),
    "deidentified": frozenset({"view", "read", "aggregate"}),
    "full": frozenset({"*"}),
}


def get_permission_level(role: str, resource: str) -> str | None:
    """Raw permission level for a (role, resource) pair; None when ungranted."""
    return RBAC_MATRIX.get(role, {}).get(resource)


def check_permission(role: str, resource: str, action: str) -> bool:
    """True when the role's level on the resource includes the action."""
    level = get_permission_level(role, resource)
    if level is None:
        return False
    allowed = _LEVEL_ACTIONS.get(level, frozenset())
    return "*" in allowed or action in allowed


def require_permission(role: str, resource: str, action: str) -> None:
    """Raise HTTPException 403 unless the role may perform the action."""
    if not check_permission(role, resource, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' lacks '{action}' permission on '{resource}'",
        )
