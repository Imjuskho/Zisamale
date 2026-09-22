"""Alert delivery pipeline.

Fans an alert out over multiple channels (WebSocket, SMS via Africa's
Talking, email via SMTP), records per-channel delivery receipts, and
escalates alerts that sit unacknowledged past a configurable window.

External providers are stubbed when credentials are not configured: the
call succeeds locally and is logged with `provider=stub`, so development
and test environments exercise the full pipeline without network access.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
import ssl
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.message import EmailMessage
from enum import StrEnum
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

AFRICAS_TALKING_SMS_URL = "https://api.africastalking.com/version1/messaging"


class DeliveryChannel(StrEnum):
    WEBSOCKET = "websocket"
    SMS = "sms"
    EMAIL = "email"


class DeliveryStatus(StrEnum):
    SENT = "sent"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass(slots=True)
class DeliveryReceipt:
    alert_id: str
    channel: str
    status: str
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    recipient: str | None = None
    detail: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "channel": self.channel,
            "status": self.status,
            "timestamp": self.timestamp,
            "recipient": self.recipient,
            "detail": self.detail,
        }


def _alert_field(alert: Any, name: str, default: Any = None) -> Any:
    if isinstance(alert, dict):
        return alert.get(name, default)
    return getattr(alert, name, default)


def alert_to_dict(alert: Any) -> dict[str, Any]:
    """Accept dicts or model objects and normalise to a plain dict."""
    if isinstance(alert, dict):
        return dict(alert)
    result: dict[str, Any] = {}
    for name in (
        "alert_id",
        "disease",
        "district_id",
        "ta_name",
        "alert_level",
        "risk_score",
        "predicted_cases",
        "recommended_actions",
        "generated_at",
        "status",
    ):
        value = getattr(alert, name, None)
        if isinstance(value, datetime):
            value = value.isoformat()
        result[name] = value
    return result


class AlertDeliveryService:
    """Fan-out delivery across channels with receipts and escalation."""

    def __init__(
        self,
        *,
        ws_manager: Any | None = None,
        sms_sender: Callable[[str, str], Any] | None = None,
        email_sender: Callable[[str, str, str], Any] | None = None,
        max_receipts_per_alert: int = 100,
    ) -> None:
        from app.websocket import manager as default_ws_manager

        self.ws_manager = ws_manager or default_ws_manager
        self._custom_sms_sender = sms_sender
        self._custom_email_sender = email_sender
        self._max_receipts = max_receipts_per_alert
        self._receipts: dict[str, list[DeliveryReceipt]] = {}
        self._alerts: dict[str, dict[str, Any]] = {}
        self._escalations: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------ fan-out

    async def deliver_alert(
        self,
        alert: Any,
        channels: list[str] | None = None,
        recipients: dict[str, str] | None = None,
    ) -> list[DeliveryReceipt]:
        """Deliver an alert over the requested channels concurrently."""
        payload = alert_to_dict(alert)
        alert_id = str(_alert_field(payload, "alert_id") or "")
        if not alert_id:
            raise ValueError("alert must carry an alert_id")
        channels = channels or ["websocket"]
        recipients = recipients or {}
        self._alerts[alert_id] = {**payload, "delivered_at": datetime.now(UTC).isoformat()}

        district_id = str(_alert_field(payload, "district_id") or "all")

        tasks: dict[str, asyncio.Task[DeliveryReceipt]] = {}
        for channel in channels:
            if channel == DeliveryChannel.WEBSOCKET.value:
                tasks[channel] = asyncio.create_task(
                    self.deliver_via_websocket(payload, district_id)
                )
            elif channel == DeliveryChannel.SMS.value:
                phone = recipients.get("phone") or _alert_field(payload, "phone")
                tasks[channel] = asyncio.create_task(
                    self.deliver_via_sms(payload, str(phone) if phone else "")
                )
            elif channel == DeliveryChannel.EMAIL.value:
                email = recipients.get("email") or _alert_field(payload, "email")
                tasks[channel] = asyncio.create_task(
                    self.deliver_via_email(payload, str(email) if email else "")
                )
            else:
                logger.warning("delivery.unknown_channel", extra={"channel": channel})

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        receipts: list[DeliveryReceipt] = []
        for channel, outcome in zip(tasks.keys(), results, strict=True):
            if isinstance(outcome, BaseException):
                receipt = self.track_delivery(
                    alert_id,
                    channel,
                    DeliveryStatus.FAILED.value,
                    recipient=recipients.get(channel),
                    detail=str(outcome),
                )
            else:
                receipt = outcome
            receipts.append(receipt)

        logger.info(
            "delivery.fan_out_complete",
            extra={
                "alert_id": alert_id,
                "channels": channels,
                "sent": sum(1 for r in receipts if r.status == "sent"),
                "failed": sum(1 for r in receipts if r.status == "failed"),
            },
        )
        return receipts

    # ----------------------------------------------------------- channels

    async def deliver_via_websocket(self, alert: Any, district_id: str) -> DeliveryReceipt:
        payload = alert_to_dict(alert)
        alert_id = str(_alert_field(payload, "alert_id") or "")
        try:
            await self.ws_manager.broadcast_alert({**payload, "district_id": district_id})
        except Exception as exc:
            return self.track_delivery(
                alert_id,
                DeliveryChannel.WEBSOCKET.value,
                DeliveryStatus.FAILED.value,
                recipient=f"district:{district_id}",
                detail=str(exc),
            )
        return self.track_delivery(
            alert_id,
            DeliveryChannel.WEBSOCKET.value,
            DeliveryStatus.SENT.value,
            recipient=f"district:{district_id}",
        )

    async def deliver_via_sms(self, alert: Any, phone_number: str) -> DeliveryReceipt:
        payload = alert_to_dict(alert)
        alert_id = str(_alert_field(payload, "alert_id") or "")
        if not phone_number:
            return self.track_delivery(
                alert_id,
                DeliveryChannel.SMS.value,
                DeliveryStatus.SKIPPED.value,
                detail="no_phone_number",
            )

        area = (
            _alert_field(payload, "ta_name") or _alert_field(payload, "district_id") or "your area"
        )
        predicted = _alert_field(payload, "predicted_cases", "n/a")
        message = (
            f"ZISAMALE {_alert_field(payload, 'alert_level', '').upper()} ALERT: "
            f"{_alert_field(payload, 'disease', 'unknown')} risk in {area}. "
            f"Predicted cases: {predicted}. Check dashboard and respond."
        )

        api_key = settings.africas_talking_api_key
        if not api_key:
            logger.info(
                "delivery.sms_stub",
                extra={"alert_id": alert_id, "to": phone_number, "provider": "stub"},
            )
            return self.track_delivery(
                alert_id,
                DeliveryChannel.SMS.value,
                DeliveryStatus.SENT.value,
                recipient=phone_number,
                detail="stub:no_api_key",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    AFRICAS_TALKING_SMS_URL,
                    headers={
                        "apiKey": api_key,
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json",
                    },
                    data={
                        "username": settings.africas_talking_username,
                        "to": phone_number,
                        "message": message,
                        **(
                            {"from": settings.africas_talking_sender_id}
                            if settings.africas_talking_sender_id
                            else {}
                        ),
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            return self.track_delivery(
                alert_id,
                DeliveryChannel.SMS.value,
                DeliveryStatus.FAILED.value,
                recipient=phone_number,
                detail=str(exc),
            )
        return self.track_delivery(
            alert_id,
            DeliveryChannel.SMS.value,
            DeliveryStatus.SENT.value,
            recipient=phone_number,
        )

    async def deliver_via_email(self, alert: Any, email: str) -> DeliveryReceipt:
        payload = alert_to_dict(alert)
        alert_id = str(_alert_field(payload, "alert_id") or "")
        if not email:
            return self.track_delivery(
                alert_id,
                DeliveryChannel.EMAIL.value,
                DeliveryStatus.SKIPPED.value,
                detail="no_email_address",
            )

        subject = (
            f"[Zisamale] {_alert_field(payload, 'alert_level', '').upper()} alert: "
            f"{_alert_field(payload, 'disease', 'outbreak risk')}"
        )
        body = (
            f"Alert {alert_id}\n"
            f"Disease: {_alert_field(payload, 'disease')}\n"
            f"District: {_alert_field(payload, 'district_id')}\n"
            f"Risk score: {_alert_field(payload, 'risk_score')}\n"
            f"Predicted cases: {_alert_field(payload, 'predicted_cases')}\n\n"
            f"Recommended actions:\n"
            + "\n".join(
                f"- {action}" for action in (_alert_field(payload, "recommended_actions") or [])
            )
        )

        if not settings.smtp_host:
            logger.info(
                "delivery.email_stub",
                extra={"alert_id": alert_id, "to": email, "provider": "stub"},
            )
            return self.track_delivery(
                alert_id,
                DeliveryChannel.EMAIL.value,
                DeliveryStatus.SENT.value,
                recipient=email,
                detail="stub:no_smtp_host",
            )

        def _send() -> None:
            message = EmailMessage()
            message["Subject"] = subject
            message["From"] = settings.smtp_from_addr
            message["To"] = email
            message.set_content(body)
            if settings.smtp_use_tls:
                context = ssl.create_default_context()
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    server.starttls(context=context)
                    if settings.smtp_username:
                        server.login(settings.smtp_username, settings.smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    server.send_message(message)

        try:
            await asyncio.to_thread(_send)
        except Exception as exc:
            return self.track_delivery(
                alert_id,
                DeliveryChannel.EMAIL.value,
                DeliveryStatus.FAILED.value,
                recipient=email,
                detail=str(exc),
            )
        return self.track_delivery(
            alert_id,
            DeliveryChannel.EMAIL.value,
            DeliveryStatus.SENT.value,
            recipient=email,
        )

    # ----------------------------------------------------------- receipts

    def track_delivery(
        self,
        alert_id: str,
        channel: str,
        status: str,
        timestamp: str | None = None,
        recipient: str | None = None,
        detail: str | None = None,
    ) -> DeliveryReceipt:
        """Record (and log) a delivery receipt for one channel."""
        receipt = DeliveryReceipt(
            alert_id=alert_id,
            channel=channel,
            status=status,
            timestamp=timestamp or datetime.now(UTC).isoformat(),
            recipient=recipient,
            detail=detail,
        )
        bucket = self._receipts.setdefault(alert_id, [])
        bucket.append(receipt)
        if len(bucket) > self._max_receipts:
            del bucket[: len(bucket) - self._max_receipts]
        logger.info(
            "delivery.receipt",
            extra=receipt.as_dict(),
        )
        return receipt

    def get_deliveries(self, alert_id: str) -> list[DeliveryReceipt]:
        return list(self._receipts.get(alert_id, []))

    # --------------------------------------------------------- escalation

    async def escalate_alert(
        self,
        alert_id: str,
        hours_waiting: float = 4,
        *,
        alert: Any | None = None,
        escalation_recipients: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Re-deliver an alert to senior channels if unacknowledged too long.

        Returns a summary; `escalated` is False when the alert was already
        acknowledged, is too recent, or is unknown to this service.
        """
        snapshot = (
            dict(alert_to_dict(alert))
            if alert is not None
            else (self._alerts.get(alert_id) or {}).copy()
        )
        if not snapshot:
            return {"escalated": False, "reason": "unknown_alert", "alert_id": alert_id}

        status = str(snapshot.get("status") or "pending")
        if status in {"acknowledged", "in_progress", "resolved"}:
            return {
                "escalated": False,
                "reason": f"already_{status}",
                "alert_id": alert_id,
            }

        generated_at_raw = snapshot.get("generated_at") or snapshot.get("delivered_at")
        waiting_hours: float | None = None
        if generated_at_raw:
            generated_at = self._coerce_datetime(generated_at_raw)
            if generated_at is not None:
                now = datetime.now(UTC)
                if generated_at.tzinfo is None:
                    generated_at = generated_at.replace(tzinfo=UTC)
                waiting_hours = (now - generated_at).total_seconds() / 3600.0
                if waiting_hours < hours_waiting:
                    return {
                        "escalated": False,
                        "reason": "within_window",
                        "alert_id": alert_id,
                        "hours_waiting": round(waiting_hours, 2),
                    }

        previous = self._escalations.get(alert_id)
        if previous:
            return {
                "escalated": False,
                "reason": "already_escalated",
                "alert_id": alert_id,
                "escalated_at": previous.get("escalated_at"),
            }

        recipients = escalation_recipients or {}
        recipient_key = {"sms": "phone", "email": "email"}
        if recipients:
            channels = [ch for ch in ("sms", "email") if recipients.get(recipient_key[ch])] or [
                "sms",
                "email",
            ]
        else:
            channels = ["sms", "email"]

        receipts = await self.deliver_alert(
            {**snapshot, "status": "pending"},
            channels=channels,
            recipients=recipients,
        )
        record = {
            "alert_id": alert_id,
            "escalated_at": datetime.now(UTC).isoformat(),
            "hours_waiting": round(waiting_hours, 2) if waiting_hours is not None else None,
            "channels": channels,
        }
        self._escalations[alert_id] = record
        logger.warning(
            "delivery.escalated",
            extra={**record, "receipts": len(receipts)},
        )
        return {"escalated": True, "alert_id": alert_id, **record}

    @staticmethod
    def _coerce_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value
        try:
            text = str(value).replace("Z", "+00:00")
            return datetime.fromisoformat(text)
        except ValueError:
            return None


delivery_service = AlertDeliveryService()
