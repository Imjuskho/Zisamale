"""File upload endpoints for CHW photos and documents."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.deps import get_current_user, require_role
from app.uploads import get_upload_stats, save_upload

router = APIRouter(prefix="/api/v1", tags=["uploads"])


@router.post("/photos")
async def upload_photo(
    file: UploadFile = File(...),
    visit_id: str | None = None,
    user: dict = Depends(require_role("chw", "supervisor")),
):
    try:
        result = await save_upload(file, visit_id)
        return {
            "status": "uploaded",
            **result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/uploads/stats")
async def upload_statistics(user: dict = Depends(get_current_user)):
    return get_upload_stats()
