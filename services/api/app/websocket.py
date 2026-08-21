"""WebSocket manager for real-time alert broadcasting."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[channel].append(websocket)
        logger.info(f"WebSocket connected to channel: {channel}")

    async def disconnect(self, websocket: WebSocket, channel: str) -> None:
        async with self._lock:
            if websocket in self._connections[channel]:
                self._connections[channel].remove(websocket)
        logger.info(f"WebSocket disconnected from channel: {channel}")

    async def broadcast(self, channel: str, message: dict) -> None:
        async with self._lock:
            dead = []
            for ws in self._connections[channel]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._connections[channel].remove(ws)

    async def broadcast_alert(self, alert: dict) -> None:
        district_id = alert.get("district_id", "all")
        await self.broadcast(f"alerts:{district_id}", {
            "type": "alert",
            "data": alert,
        })
        await self.broadcast("alerts:all", {
            "type": "alert",
            "data": alert,
        })

    def get_connection_count(self) -> int:
        return sum(len(conns) for conns in self._connections.values())

    def get_channels(self) -> list[str]:
        return list(self._connections.keys())


manager = ConnectionManager()
