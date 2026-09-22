"""Offline-first batch upserts — the deep module behind device sync.

One interface, :func:`apply_batch`, hides every policy that used to be
copy-pasted across the CHW sync routers and the CHT ingest path:

- the select-by-natural-key loop
- the conflict policy when the server already holds synced data
- mandatory transforms at the ingest boundary — GPS coarsening (ADR-005 §1)
  and override-reason rejection (ADR-005 §3) live here, not per router
- per-item failure receipts: one bad row never fails the batch
- owner binding: server-derived identity, never body-supplied for CHWs
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.privacy import cloud_gps

SYNCED = "synced"
SERVER_NEWER = "Server has newer synced version"


@dataclass(slots=True)
class BatchResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    failures: list[dict[str, Any]] = field(default_factory=list)

    @property
    def processed(self) -> int:
        return self.created + self.updated


Transform = Callable[[dict], None]
RowBuilder = Callable[[dict], dict]
RowUpdater = Callable[[Any, dict], None]


@dataclass(slots=True)
class SyncEntity:
    """Everything the engine needs to know about one entity kind."""

    model: type
    natural_key: str
    build: RowBuilder
    update: RowUpdater | None = None
    transforms: tuple[Transform, ...] = ()
    # conflict_if_synced: device paths — server row wins once synced
    # always_update:      external systems of record (CHT) — they are the truth
    # skip:               idempotent replay of external docs — drop silently
    on_existing: str = "conflict_if_synced"
    conflict_reason: str = SERVER_NEWER


# ── Shared transforms (ADR-005 enforcement points) ────────────────


def coarsen_gps(item: dict) -> None:
    """§1: exact coordinates never reach the cloud."""
    item["gps_lat"], item["gps_lon"] = cloud_gps(item.get("gps_lat"), item.get("gps_lon"))


def require_override_reason(item: dict) -> None:
    """§3: an override without a reason is not a training label."""
    if item.get("chw_override") and not str(item.get("chw_override_reason") or "").strip():
        raise ValueError("chw_override_reason is required when chw_override is true")


def parse_client_datetime(raw: Any) -> datetime:
    """ISO-8601 or epoch seconds/millis → naive UTC datetime (DB convention).

    One parser for every sync path; raises ValueError so batch callers can
    turn garbage dates into per-item failure receipts.
    """
    if isinstance(raw, datetime):
        parsed = raw
    elif isinstance(raw, (int, float)) and not isinstance(raw, bool):
        ts = float(raw)
        if ts > 10_000_000_000:
            ts = ts / 1000
        parsed = datetime.fromtimestamp(ts, tz=UTC)
    else:
        text = str(raw or "").strip()
        if not text:
            raise ValueError("date is required")
        if text.isdigit():
            ts = int(text)
            if ts > 10_000_000_000:
                ts = ts / 1000
            parsed = datetime.fromtimestamp(ts, tz=UTC)
        else:
            try:
                parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError(f"invalid date {raw!r}") from exc
    if parsed.tzinfo is None:
        return parsed
    return parsed.astimezone(UTC).replace(tzinfo=None)


def coerce_datetime_field(key: str) -> Transform:
    def transform(item: dict) -> None:
        item[key] = parse_client_datetime(item.get(key))

    return transform


# ── The engine ─────────────────────────────────────────────────────


async def apply_batch(
    db: AsyncSession,
    entity: SyncEntity,
    items: list[dict],
    *,
    owner_chw_id: str | None = None,
) -> BatchResult:
    """Upsert a batch of items under the entity's policy.

    Per-item errors land in ``failures`` as receipts; the batch itself never
    raises because of row content. Commit discipline stays with the caller.
    """
    result = BatchResult()
    failure_kind = entity.natural_key.removesuffix("_id")

    # ── Batch pre-load: single query replaces N individual SELECTs ──
    all_keys = [
        k for raw in items
        if (k := dict(raw).get(entity.natural_key)) is not None
    ]
    existing_map: dict[Any, Any] = {}
    if all_keys:
        # Split into chunks of 500 to avoid PG parameter limit
        key_col = getattr(entity.model, entity.natural_key)
        for chunk_start in range(0, len(all_keys), 500):
            chunk = all_keys[chunk_start : chunk_start + 500]
            batch_result = await db.execute(
                select(entity.model).where(key_col.in_(chunk))
            )
            for row in batch_result.scalars().all():
                existing_map[getattr(row, entity.natural_key)] = row

    for raw in items:
        item = dict(raw)
        key_value = item.get(entity.natural_key)
        key_repr = str(key_value)
        try:
            for transform in entity.transforms:
                transform(item)

            existing = existing_map.get(key_value)

            if existing is not None:
                if entity.on_existing == "skip":
                    result.skipped += 1
                    continue
                if (
                    entity.on_existing == "conflict_if_synced"
                    and getattr(existing, "sync_status", None) == SYNCED
                ):
                    result.failures.append({
                        "type": failure_kind,
                        "id": key_repr,
                        "reason": entity.conflict_reason,
                    })
                    continue
                _bind_owner(existing, item, owner_chw_id)
                if entity.update is not None:
                    entity.update(existing, item)
                if hasattr(existing, "sync_status"):
                    existing.sync_status = SYNCED
                result.updated += 1
            else:
                kwargs = entity.build(item)
                kwargs[entity.natural_key] = key_value
                _bind_owner(None, kwargs, owner_chw_id)
                db.add(entity.model(**kwargs))
                result.created += 1
        except Exception as exc:  # noqa: BLE001 — receipt, not crash
            result.failures.append({
                "type": failure_kind,
                "id": key_repr,
                "reason": str(exc),
            })

    return result


def _bind_owner(row: Any, values: dict, owner_chw_id: str | None) -> None:
    """Catchment identity comes from the token, never from the payload (#2)."""
    if not owner_chw_id:
        return
    target = row if row is not None else values
    if hasattr(target, "chw_id"):
        target.chw_id = owner_chw_id
    elif isinstance(target, dict):
        target["chw_id"] = owner_chw_id


def token_chw_id(user: dict, requested: str | None = None) -> str | None:
    """Server-side identity resolution: CHWs always own their own catchment.

    Ownership columns (visit/household/pregnancy.chw_id) store the owning
    user's UUID. ``user["chw_id"]`` is only the operator display code, so the
    catchment identity must come from ``sub`` (the user UUID).
    """
    if user.get("role") == "chw":
        identity = user.get("sub") or user.get("chw_id")
        return str(identity) if identity else None
    return str(requested) if requested else None
