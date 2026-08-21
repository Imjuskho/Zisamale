"""Offline-first sync simulation tests.

Simulates the Zisamale mobile data flow: CHW devices collect data offline for a
week, queue it locally, then sync with the cloud server. Covers queueing,
conflict resolution between devices, incremental transfer and sync metadata.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from sync_simulator import DeviceClient, SyncServer

BASE_TIME = datetime(2026, 8, 10, 8, 0, 0)


def _household_record(day: int, index: int) -> tuple[str, dict]:
    return (
        f"household-{day}-{index}",
        {
            "village_name": f"Village {day}{index}",
            "household_size": 3 + (day + index) % 5,
            "food_security_score": 1 + (day * index) % 5,
            "distance_to_facility_km": 2.0 + ((day * 7 + index) % 15),
        },
    )


@pytest.fixture()
def device() -> DeviceClient:
    return DeviceClient("device-chw-001")


@pytest.fixture()
def server() -> SyncServer:
    return SyncServer()


def test_offline_data_queueing(device, server):
    """7 days of offline collection queues every record, then syncs losslessly."""
    # Collect 5 household registrations per day for 7 days while offline.
    for day in range(1, 8):
        collected_at = BASE_TIME + timedelta(days=day - 1)
        for index in range(1, 6):
            record_id, fields = _household_record(day, index)
            device.collect(record_id, "household", fields, when=collected_at)

    assert device.pending_count == 35
    queued_ids = [r.record_id for r in device.queue]
    assert len(set(queued_ids)) == 35, "no duplicates may enter the queue"
    assert queued_ids == sorted(queued_ids), "queue preserves collection order"

    # Connectivity returns; a single push drains the queue.
    report = device.push(server)
    assert device.pending_count == 0
    assert report.created == 35
    assert report.updated == 0
    assert len(server.records) == 35

    synced = sorted(server.records.values(), key=lambda r: r.record_id)
    day7_records = [r for r in synced if r.record_id.startswith("household-7-")]
    assert len(day7_records) == 5
    for record in day7_records:
        assert record.synced_at is not None
        assert record.version == {"device-chw-001": 1}


def test_conflict_resolution(server):
    """Two devices editing one record concurrently merge without data loss."""
    device_a = DeviceClient("device-a")
    device_b = DeviceClient("device-b")

    t0 = BASE_TIME
    device_a.collect(
        "pregnancy-001",
        "pregnancy",
        {"woman_name": "Esnat Phiri", "bp_systolic": 130, "hemoglobin": 9.5},
        when=t0,
    )
    device_a.push(server)

    # Both devices pull the same baseline, go offline, and edit different fields.
    device_b.pull(server)
    t1 = t0 + timedelta(hours=2)
    device_b.edit("pregnancy-001", {"hemoglobin": 8.1}, when=t1)  # lab result entered

    t2 = t0 + timedelta(hours=3)
    device_a.edit("pregnancy-001", {"bp_systolic": 155}, when=t2)  # new BP reading

    device_b.push(server)
    report = device_a.push(server)

    merged = server.records["pregnancy-001"]
    # Non-conflicting field edits from both devices are retained.
    assert merged.fields["woman_name"] == "Esnat Phiri"
    assert merged.fields["hemoglobin"] == 8.1
    assert merged.fields["bp_systolic"] == 155
    # Version vector now reflects both devices.
    assert merged.version["device-a"] == 2
    assert merged.version["device-b"] == 1
    assert report.conflicts_resolved == 0


def test_conflict_resolution_same_field_lww(server):
    """Concurrent writes to the SAME field resolve deterministically (LWW)."""
    device_a = DeviceClient("device-a")
    device_b = DeviceClient("device-b")

    device_a.collect("visit-001", "visit", {"chw_notes": "initial"}, when=BASE_TIME)
    device_a.push(server)
    device_b.pull(server)

    later = BASE_TIME + timedelta(minutes=30)
    earlier = BASE_TIME + timedelta(minutes=10)

    device_b.edit("visit-001", {"chw_notes": "edited on device B"}, when=later)
    device_a.edit("visit-001", {"chw_notes": "edited on device A"}, when=earlier)

    device_b.push(server)
    report = device_a.push(server)

    merged = server.records["visit-001"]
    # Device B wrote later, so its value wins regardless of push order.
    assert merged.fields["chw_notes"] == "edited on device B"
    assert report.conflicts_resolved >= 1
    # Deterministic even if pushes happen in the opposite order.
    server2 = SyncServer()
    device_c = DeviceClient("device-c")
    device_d = DeviceClient("device-d")
    device_c.collect("visit-002", "visit", {"chw_notes": "initial"}, when=BASE_TIME)
    device_c.push(server2)
    device_d.pull(server2)
    device_d.edit("visit-002", {"chw_notes": "D wins"}, when=later)
    device_c.edit("visit-002", {"chw_notes": "C loses"}, when=earlier)
    device_d.push(server2)
    device_c.push(server2)
    assert server2.records["visit-002"].fields["chw_notes"] == "D wins"


def test_incremental_sync(server):
    """Pulls return only records changed since the client's cursor."""
    device = DeviceClient("device-chw-002")

    # Day 1: three records created and synced.
    for i in range(3):
        record_id, fields = _household_record(1, i + 1)
        device.collect(record_id, "household", fields, when=BASE_TIME + timedelta(hours=i))
    device.push(server)

    first_pull = device.pull(server)
    assert len(first_pull) == 3
    assert device.last_sync is not None

    # Day 2: two new records plus one edit to an existing record.
    t_day2 = BASE_TIME + timedelta(days=1)
    for i in range(2):
        record_id, fields = _household_record(2, i + 1)
        device.collect(record_id, "household", fields, when=t_day2 + timedelta(hours=i))
    device.edit("household-1-1", {"household_size": 9}, when=t_day2)
    device.push(server)

    second_pull = device.pull(server)
    changed_ids = {r.record_id for r in second_pull}
    assert changed_ids == {"household-2-1", "household-2-2", "household-1-1"}
    assert all(r.updated_at > first_pull[0].updated_at for r in second_pull)

    # An immediate re-pull transfers nothing new.
    assert device.pull(server) == []

    # A brand-new device with no cursor receives everything.
    fresh = DeviceClient("device-fresh")
    assert len(fresh.pull(server)) == 5


def test_sync_metadata(server):
    """Sync timestamps, device ids and version vectors are tracked correctly."""
    device = DeviceClient("device-meta-01")

    t1 = BASE_TIME
    device.collect("child-001", "child", {"muac": 11.2}, when=t1)
    device.edit("child-001", {"has_fever": True}, when=t1 + timedelta(minutes=5))
    pushed_at = t1 + timedelta(minutes=10)
    report = device.push(server)
    assert report.synced_at is not None

    stored = server.records["child-001"]
    # Version vector counts per-device changes monotonically.
    assert stored.version == {"device-meta-01": 2}
    # Field-level provenance identifies which device last wrote each field.
    assert stored.field_versions["muac"] == {"device-meta-01": 1}
    assert stored.field_versions["has_fever"] == {"device-meta-01": 2}
    # Record timestamp reflects the latest logical write, not the sync time.
    assert stored.updated_at == t1 + timedelta(minutes=5)
    assert stored.synced_at is not None

    # Server-side cursor advances only as far as the client has pulled.
    device.pull(server)
    assert server.cursors["device-meta-01"] == stored.updated_at

    # A second device syncing the same record extends the version vector.
    device_b = DeviceClient("device-meta-02")
    device_b.pull(server)
    device_b.edit("child-001", {"muac": 10.8}, when=t1 + timedelta(days=1))
    device_b.push(server)

    stored_after = server.records["child-001"]
    assert stored_after.version == {"device-meta-01": 2, "device-meta-02": 1}
    assert stored_after.field_versions["muac"] == {"device-meta-02": 1}
    assert stored_after.field_versions["has_fever"] == {"device-meta-01": 2}
