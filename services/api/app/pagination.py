"""Pagination utilities for list endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class PaginationParams(BaseModel):
    offset: int = 0
    limit: int = 50

    @property
    def page(self) -> int:
        return (self.offset // self.limit) + 1


class PaginatedResponse(BaseModel):
    items: list
    total: int
    offset: int
    limit: int
    has_next: bool
    has_previous: bool


def paginate(items: list, offset: int = 0, limit: int = 50) -> dict:
    total = len(items)
    page_items = items[offset : offset + limit]
    return {
        "items": page_items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_next": offset + limit < total,
        "has_previous": offset > 0,
    }
