"""Alert delivery: multi-channel fan-out, receipts and escalation."""

from app.alerts.delivery import (
    AlertDeliveryService,
    DeliveryChannel,
    DeliveryReceipt,
    delivery_service,
)

__all__ = [
    "AlertDeliveryService",
    "DeliveryChannel",
    "DeliveryReceipt",
    "delivery_service",
]
