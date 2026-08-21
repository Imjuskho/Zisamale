"""Self-contained simulation of the Zisamale mobile offline-first sync engine.

The Android app collects data while offline and syncs with the cloud API when
connectivity returns. This module models that protocol so integration tests can
exercise queueing, conflict resolution, incremental transfer and metadata
handling without a device or a server.

Protocol summary
----------------
* Every record carries a per-device change counter (version vector).
* Every field carries the version vector of the device that last wrote it.
* Clients upload *deltas*: only fields changed since their last sync, together
  with the field version they based their edit on (three-way merge).
* If the server-side field version still equals the client's base version the
  write applies cleanly; if another device wrote meanwhile the conflict is
  resolved last-writer-wins on logical timestamps, with the sorted version
  vector as a deterministic tie-breaker.
* Pulls are incremental: clients pass their per-device cursor (the timestamp of
  the last batch received) and only newer records are returned.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime


def _vector_dominates(a: dict[str, int], b: dict[str, int]) -> bool:
    """True if every counter in ``a`` is >= the matching counter in ``b``."""
    return all(a.get(device, 0) >= count for device, count in b.items())


@dataclass
class FieldChange:
    """One field uploaded by a device, plus the base it was edited against."""

    value: object
    version: dict[str, int]
    base_version: dict[str, int] | None


@dataclass
class SyncRecord:
    record_id: str
    record_type: str
    fields: dict = field(default_factory=dict)
    version: dict[str, int] = field(default_factory=dict)
    field_versions: dict[str, dict[str, int]] = field(default_factory=dict)
    updated_at: datetime | None = None
    synced_at: datetime | None = None
    deleted: bool = False

    def touch(self, device_id: str, changed_fields: list[str], when: datetime) -> None:
        counter = self.version.get(device_id, 0) + 1
        self.version[device_id] = counter
        for name in changed_fields:
            self.field_versions[name] = {device_id: counter}
        self.updated_at = when

    def copy(self) -> "SyncRecord":
        return copy.deepcopy(self)


@dataclass
class PushPayload:
    """What a device uploads for one record: full identity + changed fields."""

    record_id: str
    record_type: str
    device_id: str
    changes: dict[str, FieldChange]
    version: dict[str, int]
    updated_at: datetime
    deleted: bool = False


@dataclass
class PushReport:
    created: int = 0
    updated: int = 0
    conflicts_resolved: int = 0
    synced_at: datetime | None = None


class DeviceClient:
    """A CHW device collecting data offline and syncing when online."""

    def __init__(self, device_id: str):
        self.device_id = device_id
        self.queue: list[PushPayload] = []
        self.local: dict[str, SyncRecord] = {}
        # Last-synced snapshot per record, used to compute deltas (three-way).
        self.baseline: dict[str, SyncRecord] = {}
        self.last_sync: datetime | None = None

    # -- offline collection -------------------------------------------------
    def collect(self, record_id: str, record_type: str, fields: dict, when: datetime) -> SyncRecord:
        record = SyncRecord(record_id=record_id, record_type=record_type, fields=dict(fields))
        record.touch(self.device_id, list(fields), when)
        self.local[record_id] = record
        self._enqueue_delta(record, changed=list(fields), base=self.baseline.get(record_id))
        return record

    def edit(self, record_id: str, changes: dict, when: datetime) -> SyncRecord:
        record = self.local[record_id]
        record.fields.update(changes)
        record.touch(self.device_id, list(changes), when)
        # Only the edited fields are uploaded - untouched fields carry stale
        # values that must never overwrite another device's newer writes.
        self._enqueue_delta(record, changed=list(changes), base=self.baseline.get(record_id))
        return record

    def _enqueue_delta(self, record: SyncRecord, changed: list[str], base: SyncRecord | None) -> None:
        base_versions = base.field_versions if base is not None else {}
        changes = {
            name: FieldChange(
                value=record.fields[name],
                version=dict(record.field_versions[name]),
                base_version=dict(base_versions[name]) if name in base_versions else None,
            )
            for name in changed
        }
        self.queue.append(
            PushPayload(
                record_id=record.record_id,
                record_type=record.record_type,
                device_id=self.device_id,
                changes=changes,
                version=dict(record.version),
                updated_at=record.updated_at,
            )
        )

    # -- sync ---------------------------------------------------------------
    @property
    def pending_count(self) -> int:
        return len(self.queue)

    def push(self, server: "SyncServer") -> PushReport:
        report = server.push(list(self.queue))
        self.queue.clear()
        for record_id, record in self.local.items():
            if record.version.get(self.device_id):
                self.baseline[record_id] = record.copy()
        return report

    def pull(self, server: "SyncServer") -> list[SyncRecord]:
        records = server.pull(self.device_id, since=self.last_sync)
        for record in records:
            existing = self.local.get(record.record_id)
            if existing is None or _vector_dominates(record.version, existing.version):
                self.local[record.record_id] = record.copy()
                self.baseline[record.record_id] = record.copy()
        if records:
            newest = max(r.updated_at for r in records)
            self.last_sync = newest
            server.set_cursor(self.device_id, newest)
        return records


class SyncServer:
    """Cloud-side record store implementing three-way merge + incremental pull."""

    def __init__(self):
        self.records: dict[str, SyncRecord] = {}
        self.cursors: dict[str, datetime] = {}

    def push(self, incoming: list[PushPayload]) -> PushReport:
        report = PushReport(synced_at=datetime.now())
        for payload in incoming:
            stored = self.records.get(payload.record_id)
            if stored is None:
                stored = SyncRecord(
                    record_id=payload.record_id,
                    record_type=payload.record_type,
                    updated_at=payload.updated_at,
                    synced_at=report.synced_at,
                )
                for name, change in payload.changes.items():
                    stored.fields[name] = change.value
                    stored.field_versions[name] = dict(change.version)
                stored.version = dict(payload.version)
                self.records[payload.record_id] = stored
                report.created += 1
                continue

            self._merge(stored, payload, report)
        return report

    def _merge(self, stored: SyncRecord, payload: PushPayload, report: PushReport) -> None:
        for name, change in payload.changes.items():
            server_version = stored.field_versions.get(name)
            if server_version == change.base_version:
                # Nobody else touched this field since the client synced.
                if stored.fields.get(name) != change.value:
                    stored.fields[name] = change.value
                    stored.field_versions[name] = dict(change.version)
                continue

            # Concurrent modification: last logical writer wins.
            report.conflicts_resolved += 1
            client_wins = (payload.updated_at, sorted(change.version)) >= (
                stored.updated_at or datetime.min,
                sorted(server_version or {}),
            )
            if client_wins:
                stored.fields[name] = change.value
                stored.field_versions[name] = dict(change.version)

        for device, count in payload.version.items():
            stored.version[device] = max(stored.version.get(device, 0), count)
        if payload.updated_at > (stored.updated_at or datetime.min):
            stored.updated_at = payload.updated_at
        report.updated += 1

    def pull(self, device_id: str, since: datetime | None = None) -> list[SyncRecord]:
        cursor = since or self.cursors.get(device_id)
        records = [
            r.copy()
            for r in self.records.values()
            if r.updated_at is not None and (cursor is None or r.updated_at > cursor)
        ]
        records.sort(key=lambda r: r.updated_at)
        return records

    def set_cursor(self, device_id: str, cursor: datetime) -> None:
        current = self.cursors.get(device_id)
        if current is None or cursor > current:
            self.cursors[device_id] = cursor
