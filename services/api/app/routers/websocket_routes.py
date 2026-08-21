"""WebSocket endpoints for real-time alert streaming."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/alerts/{district_id}")
async def alert_stream(websocket: WebSocket, district_id: str):
    channel = f"alerts:{district_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, channel)


@router.websocket("/ws/alerts")
async def global_alert_stream(websocket: WebSocket):
    await manager.connect(websocket, "alerts:all")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "alerts:all")
