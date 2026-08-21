package com.zisamale.sync

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.ByteArrayInputStream
import java.time.Instant
import java.util.zip.GZIPInputStream

class SyncEngineTest {

    private class FakeEntity(
        override val id: String,
        override val entityType: String,
        override val localVersion: Long = 1L,
        override val remoteVersion: Long = 0L,
        override val lastModified: Instant = Instant.parse("2026-08-21T00:00:00Z"),
        override val syncStatus: SyncStatus = SyncStatus.PENDING
    ) : SyncableEntity

    private class FakeTransport(
        var conflictsOnPush: Map<String, SyncableEntity> = emptyMap(),
        var pullResult: List<SyncableEntity> = emptyList(),
        var failPush: Boolean = false
    ) : SyncTransport {
        var pushedBatches: MutableList<List<SyncableEntity>> = mutableListOf()
        var pulledSince: Instant? = null

        override suspend fun push(changes: List<SyncableEntity>): Map<String, SyncableEntity> {
            if (failPush) throw IllegalStateException("network down")
            pushedBatches.add(changes)
            return conflictsOnPush.filterKeys { id -> changes.any { it.id == id } }
        }

        override suspend fun pull(since: Instant): List<SyncableEntity> {
            pulledSince = since
            return pullResult
        }
    }

    private lateinit var transport: FakeTransport
    private lateinit var engine: SyncEngineImpl

    @Before
    fun setUp() {
        transport = FakeTransport()
        engine = SyncEngineImpl(transport)
    }

    // ---- Conflict resolution -------------------------------------------------

    @Test
    fun `conflict resolution - chw authored notes win locally`() {
        val local = FakeEntity("v1", "visit_notes")
        val remote = FakeEntity("v1", "visit_notes")
        assertEquals(Resolution.LOCAL_WINS, engine.resolveConflict(local, remote))

        val observation = FakeEntity("o1", "chw_observation")
        assertEquals(
            Resolution.LOCAL_WINS,
            engine.resolveConflict(observation, FakeEntity("o1", "chw_observation"))
        )
    }

    @Test
    fun `conflict resolution - server wins for demographics facility and referral`() {
        for (type in listOf("patient_demographics", "facility", "referral")) {
            val result = engine.resolveConflict(FakeEntity("x", type), FakeEntity("x", type))
            assertEquals("expected SERVER_WINS for $type", Resolution.SERVER_WINS, result)
        }
    }

    @Test
    fun `conflict resolution - risk score is recomputed`() {
        assertEquals(
            Resolution.RECOMPUTE,
            engine.resolveConflict(FakeEntity("r1", "risk_score"), FakeEntity("r1", "risk_score"))
        )
    }

    @Test
    fun `conflict resolution - unknown entity types default to server wins`() {
        assertEquals(
            Resolution.SERVER_WINS,
            engine.resolveConflict(FakeEntity("u1", "something_new"), FakeEntity("u1", "something_new"))
        )
    }

    @Test
    fun `push applies conflict resolutions per entity type`() = runTest {
        val localNote = FakeEntity("n1", "visit_notes")
        val serverDemo = FakeEntity("d1", "patient_demographics", remoteVersion = 5)
        val riskScore = FakeEntity("rs1", "risk_score", remoteVersion = 3)
        engine.queueChange(localNote)
        engine.queueChange(FakeEntity("d1", "patient_demographics"))
        engine.queueChange(riskScore)

        transport.conflictsOnPush = mapOf(
            "n1" to FakeEntity("n1", "visit_notes", remoteVersion = 9),
            "d1" to serverDemo,
            "rs1" to FakeEntity("rs1", "risk_score", remoteVersion = 7)
        )

        val result = engine.pushDelta()

        assertEquals(0, result.pushed)
        assertEquals(3, result.conflicts)
        assertNull(engine.statusOf("d1")) // SERVER_WINS -> removed from queue
        assertEquals(SyncStatus.PENDING, engine.statusOf("n1")) // LOCAL_WINS -> retried later
        assertEquals(SyncStatus.CONFLICT, engine.statusOf("rs1")) // RECOMPUTE -> flagged
    }

    // ---- Bandwidth budget ----------------------------------------------------

    @Test
    fun `bandwidth budget blocks sync once daily cap reached`() = runTest {
        assertTrue(engine.canSync())
        engine.recordUsage(SyncEngineImpl.MAX_DAILY_BYTES)
        assertFalse(engine.canSync())

        engine.queueChange(FakeEntity("a", "visit_notes"))
        val result = engine.pushDelta()
        assertEquals(0, result.pushed)

        val pullResult = engine.pullDelta(Instant.EPOCH)
        assertEquals(0, pullResult.pulled)
    }

    @Test
    fun `daily budget reset restores sync capability`() {
        engine.recordUsage(SyncEngineImpl.MAX_DAILY_BYTES)
        assertFalse(engine.canSync())
        engine.resetDailyBudget()
        assertTrue(engine.canSync())
        assertEquals(0L, engine.bytesUsedToday())
    }

    @Test
    fun `usage accounting counts pushed and pulled payloads`() = runTest {
        engine.queueChange(FakeEntity("id-1234567890", "visit_notes"))
        engine.pushDelta()
        val afterPush = engine.bytesUsedToday()
        assertTrue(afterPush > 0)

        engine.resetDailyBudget()
        transport.pullResult = listOf(FakeEntity("remote-1", "facility"))
        engine.pullDelta(Instant.EPOCH)
        assertTrue(engine.bytesUsedToday() > 0)
    }

    // ---- Retry backoff -------------------------------------------------------

    @Test
    fun `retry backoff escalates exponentially and caps at 16s`() {
        val changeId = engine.queueChange(FakeEntity("r", "visit_notes"))
        val expected = longArrayOf(1000, 2000, 4000, 8000, 16000)
        for (attempt in 1..8) {
            val delay = engine.scheduleRetry(changeId, attempt)
            assertEquals(expected[attempt.coerceAtMost(expected.size) - 1], delay)
        }
    }

    @Test
    fun `entity is marked failed after max retry attempts`() {
        val changeId = engine.queueChange(FakeEntity("f", "referral"))
        repeat(SyncEngineImpl.MAX_RETRY_ATTEMPTS - 1) { attempt ->
            engine.scheduleRetry(changeId, attempt + 1)
            assertEquals(SyncStatus.PENDING, engine.statusOf("f"))
        }
        engine.scheduleRetry(changeId, SyncEngineImpl.MAX_RETRY_ATTEMPTS)
        assertEquals(SyncStatus.FAILED, engine.statusOf("f"))
    }

    @Test
    fun `failed push marks entities for retry`() = runTest {
        engine.queueChange(FakeEntity("p1", "chw_observation"))
        transport.failPush = true
        val result = engine.pushDelta()
        assertEquals(0, result.pushed)
        assertEquals(SyncStatus.FAILED, engine.statusOf("p1"))
    }

    // ---- Compression ---------------------------------------------------------

    @Test
    fun `payload compression shrinks repetitive data and round-trips`() {
        val original = "chw_observation,vitals,bp=142/95,hb=7.4,".repeat(200).toByteArray()
        val compressed = engine.compressPayload(original)

        assertTrue(compressed.size < original.size / 2)
        val decompressed = GZIPInputStream(ByteArrayInputStream(compressed)).use { it.readBytes() }
        assertTrue(original.contentEquals(decompressed))
    }

    @Test
    fun `engine decompress helper restores original bytes`() {
        val payload = ByteArray(4096) { (it % 7).toByte() }
        val roundTripped = engine.decompressPayload(engine.compressPayload(payload))
        assertTrue(payload.contentEquals(roundTripped))
    }

    // ---- Photo batching ------------------------------------------------------

    @Test
    fun `photos below batch threshold are deferred until threshold met`() = runTest {
        repeat(SyncEngineImpl.BATCH_PHOTO_THRESHOLD - 1) { index ->
            engine.queueChange(FakeEntity("photo-$index", SyncEngineImpl.ENTITY_PHOTO))
        }
        val result = engine.pushDelta()
        assertEquals(0, result.pushed)

        engine.queueChange(
            FakeEntity("photo-final", SyncEngineImpl.ENTITY_PHOTO)
        )
        val second = engine.pushDelta()
        assertEquals(SyncEngineImpl.BATCH_PHOTO_THRESHOLD, second.pushed)
    }

    @Test
    fun `oversized photos are rejected not uploaded`() = runTest {
        engine.queueChange(
            FakeEntity(
                "huge-photo",
                SyncEngineImpl.ENTITY_PHOTO,
                localVersion = SyncEngineImpl.MAX_PHOTO_SIZE_BYTES / 1024 + 10
            )
        )
        val result = engine.pushDelta()
        assertEquals(0, result.pushed)
        assertEquals(SyncStatus.FAILED, engine.statusOf("huge-photo"))
    }

    // ---- Push/pull basics ----------------------------------------------------

    @Test
    fun `queueing same entity twice replaces the pending copy`() = runTest {
        engine.queueChange(FakeEntity("dup", "visit_notes", localVersion = 1))
        engine.queueChange(FakeEntity("dup", "visit_notes", localVersion = 2))
        val result = engine.pushDelta()
        assertEquals(1, result.pushed)
        assertEquals(1, transport.pushedBatches.single().size)
        assertEquals(2L, transport.pushedBatches.single().single().localVersion)
    }

    @Test
    fun `pull applies remote entities and honors since cursor`() = runTest {
        transport.pullResult = listOf(
            FakeEntity("fac-1", "facility", remoteVersion = 2),
            FakeEntity("pd-1", "patient_demographics", remoteVersion = 2)
        )
        val since = Instant.parse("2026-08-20T12:00:00Z")
        val result = engine.pullDelta(since)

        assertEquals(2, result.pulled)
        assertEquals(since, transport.pulledSince)
        assertEquals(SyncStatus.SYNCED, engine.statusOf("fac-1"))
    }

    @Test
    fun `pull conflicts against newer local pending edits respect resolution`() = runTest {
        engine.queueChange(FakeEntity("note-1", "visit_notes", localVersion = 5))
        transport.pullResult = listOf(FakeEntity("note-1", "visit_notes", remoteVersion = 4))

        val result = engine.pullDelta(Instant.EPOCH)

        assertEquals(1, result.conflicts)
        assertEquals(SyncStatus.PENDING, engine.statusOf("note-1")) // LOCAL_WINS keeps local edit
    }
}
