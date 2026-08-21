from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.integrations.cht_mapping import map_cht_document, visit_to_cht_report

logger = logging.getLogger(__name__)


class ICHISAdapter:
    """iCHIS is CHT: CouchDB documents via the medic API, not a custom REST register."""

    def __init__(self) -> None:
        self.base_url = (settings.ichiss_base_url or "").rstrip("/")
        self.token = settings.ichss_token

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def fetch_reports(self, form_ids: list[str], limit: int = 100) -> list[dict[str, Any]]:
        if not self.base_url:
            logger.info("iCHIS/CHT not configured; skip pull")
            return []
        selector = {"type": "data_record", "form": {"$in": form_ids}}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/medic/_find",
                json={"selector": selector, "limit": limit},
                headers=self._headers(),
                timeout=30,
            )
            response.raise_for_status()
            return response.json().get("docs") or []

    async def push_visit(self, visit: dict[str, Any]) -> dict[str, Any] | None:
        if not self.base_url:
            return None
        payload = visit_to_cht_report(visit)
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.base_url}/medic/{payload['_id']}",
                json=payload,
                headers=self._headers(),
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def map_document(doc: dict[str, Any]) -> dict[str, Any] | None:
        return map_cht_document(doc)
