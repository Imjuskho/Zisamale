"""WebSocket endpoints for real-time alert streaming.

Connections are authenticated via JWT token in query string.
"""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth import decode_token
from app.websocket import manager

router = APIRouter(tags=["websocket"])


async def _authenticate_websocket(websocket: WebSocket) -> dict | None:
    """Validate JWT from query params. Returns claims or None."""
    token = websocket.query_params.get("token")
    if not token:
        return None
    return decode_token(token)


@router.websocket("/ws/alerts/{district_id}")
async def alert_stream(websocket: WebSocket, district_id: str):
    claims = await _authenticate_websocket(websocket)
    if not claims:
        await websocket.close(code=4001, reason="Authentication required")
        return

    channel = f"alerts:{district_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, channel)


@router.websocket("/ws/alerts")
@router.websocket("/api/v1/ws/alerts")
async def global_alert_stream(websocket: WebSocket):
    claims = await _authenticate_websocket(websocket)
    if not claims:
        await websocket.close(code=4001, reason="Authentication required")
        return

    await manager.connect(websocket, "alerts:all")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "alerts:all")
