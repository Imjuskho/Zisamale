package com.zisamale.sync

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream

enum class SyncStatus { PENDING, SYNCING, SYNCED, CONFLICT, FAILED }
enum class Resolution { SERVER_WINS, LOCAL_WINS, RECOMPUTE }

data class LocalChangeId(val id: Long)
data class SyncResult(val pushed: Int, val pulled: Int, val conflicts: Int, val durationMs: Long)

interface SyncableEntity {
    val id: String
    val entityType: String
    val localVersion: Long
    val remoteVersion: Long
    val lastModified: Instant
    val syncStatus: SyncStatus
}

/**
 * Pluggable network boundary so the engine is unit-testable without Android.
 * Implementations wrap Retrofit calls and handle IO dispatch themselves.
 */
interface SyncTransport {
    /** Returns the authoritative server entity for every id that conflicted. */
    suspend fun push(changes: List<SyncableEntity>): Map<String, SyncableEntity>
    suspend fun pull(since: Instant): List<SyncableEntity>
}

object NoOpSyncTransport : SyncTransport {
    override suspend fun push(changes: List<SyncableEntity>): Map<String, SyncableEntity> = emptyMap()
    override suspend fun pull(since: Instant): List<SyncableEntity> = emptyList()
}

class SyncEngineImpl(private val transport: SyncTransport = NoOpSyncTransport) {

    companion object {
        const val MAX_DAILY_BYTES = 5 * 1024 * 1024L  // 5MB
        const val MAX_RETRY_ATTEMPTS = 5
        const val MAX_PHOTO_SIZE_BYTES = 100 * 1024L   // 100KB
        const val BATCH_PHOTO_THRESHOLD = 5
        val BACKOFF_DELAYS = longArrayOf(1000, 2000, 4000, 8000, 16000)

        const val ENTITY_PHOTO = "photo"
        const val ENTITY_RISK_SCORE = "risk_score"
        const val ENTITY_REFERRAL = "referral"
        const val MAX_BATCH_SIZE = 50
        private const val BASE_ENTITY_WIRE_BYTES = 48L
    }

    private var dailyBytesUsed = 0L
    private var nextChangeId = 1L
    private val pendingChanges = mutableListOf<SyncableEntity>()
    private val retryAttempts = mutableMapOf<Long, Int>()
    private val entityForChangeId = mutableMapOf<Long, String>()

    @Synchronized
    fun queueChange(entity: SyncableEntity): LocalChangeId {
        pendingChanges.removeAll { it.id == entity.id && it.entityType == entity.entityType }
        pendingChanges.add(entity.withStatus(SyncStatus.PENDING))
        val changeId = LocalChangeId(nextChangeId++)
        entityForChangeId[changeId.id] = entity.id
        return changeId
    }

    @Synchronized
    fun pendingCount(): Int = pendingChanges.count { it.syncStatus != SyncStatus.SYNCED }

    @Synchronized
    fun statusOf(entityId: String): SyncStatus? =
        pendingChanges.lastOrNull { it.id == entityId }?.syncStatus

    suspend fun pushDelta(): SyncResult {
        val startedAt = System.currentTimeMillis()
        if (!canSync()) return SyncResult(0, 0, 0, elapsedSince(startedAt))

        val batch = selectBatch()
        if (batch.isEmpty()) return SyncResult(0, 0, 0, elapsedSince(startedAt))

        recordUsage(batch.sumOf { estimateWireSize(it) })
        val authoritative = try {
            transport.push(batch.map { it.withStatus(SyncStatus.SYNCING) })
        } catch (_: Exception) {
            batch.forEach { markStatus(it.id, SyncStatus.FAILED) }
            return SyncResult(0, 0, 0, elapsedSince(startedAt))
        }

        var pushed = 0
        var conflicts = 0
        for (change in batch) {
            val serverEntity = authoritative[change.id]
            if (serverEntity == null) {
                removeFromQueue(change.id)
                pushed++
                continue
            }
            conflicts++
            when (resolveConflict(change, serverEntity)) {
                Resolution.LOCAL_WINS -> markStatus(change.id, SyncStatus.PENDING)
                Resolution.SERVER_WINS -> removeFromQueue(change.id)
                Resolution.RECOMPUTE -> markStatus(change.id, SyncStatus.CONFLICT)
            }
        }
        return SyncResult(pushed, 0, conflicts, elapsedSince(startedAt))
    }

    suspend fun pullDelta(since: Instant): SyncResult {
        val startedAt = System.currentTimeMillis()
        if (!canSync()) return SyncResult(0, 0, 0, elapsedSince(startedAt))

        val remoteEntities = try {
            transport.pull(since)
        } catch (_: Exception) {
            return SyncResult(0, 0, 0, elapsedSince(startedAt))
        }
        recordUsage(remoteEntities.sumOf { estimateWireSize(it) })

        var pulled = 0
        var conflicts = 0
        for (remote in remoteEntities) {
            val local = synchronized(this) {
                pendingChanges.lastOrNull { it.id == remote.id && it.entityType == remote.entityType }
            }
            if (local == null) {
                upsertRemote(remote)
                pulled++
            } else {
                conflicts++
                when (resolveConflict(local, remote)) {
                    Resolution.LOCAL_WINS -> Unit
                    Resolution.SERVER_WINS -> {
                        upsertRemote(remote)
                        pulled++
                    }
                    Resolution.RECOMPUTE -> markStatus(local.id, SyncStatus.CONFLICT)
                }
            }
        }
        return SyncResult(0, pulled, conflicts, elapsedSince(startedAt))
    }

    fun resolveConflict(local: SyncableEntity, remote: SyncableEntity): Resolution {
        return when {
            local.entityType in listOf("visit_notes", "chw_observation") -> Resolution.LOCAL_WINS
            local.entityType in listOf("patient_demographics", "facility") -> Resolution.SERVER_WINS
            local.entityType == "risk_score" -> Resolution.RECOMPUTE
            local.entityType == "referral" -> Resolution.SERVER_WINS
            else -> Resolution.SERVER_WINS
        }
    }

    /**
     * Exponential backoff: 1s, 2s, 4s, 8s, 16s. Returns the delay to wait;
     * entities exhausting [MAX_RETRY_ATTEMPTS] are marked [SyncStatus.FAILED].
     */
    @Synchronized
    fun scheduleRetry(changeId: LocalChangeId, attempt: Int): Long {
        retryAttempts[changeId.id] = attempt
        val index = (attempt - 1).coerceIn(0, BACKOFF_DELAYS.size - 1)
        if (attempt >= MAX_RETRY_ATTEMPTS) {
            entityForChangeId[changeId.id]?.let { markStatus(it, SyncStatus.FAILED) }
        }
        return BACKOFF_DELAYS[index]
    }

    @Synchronized
    fun retryAttempt(changeId: LocalChangeId): Int = retryAttempts[changeId.id] ?: 0

    fun compressPayload(data: ByteArray): ByteArray {
        val buffer = ByteArrayOutputStream(data.size / 2 + 32)
        GZIPOutputStream(buffer).use { gzip -> gzip.write(data) }
        return buffer.toByteArray()
    }

    fun decompressPayload(data: ByteArray): ByteArray =
        GZIPInputStream(ByteArrayInputStream(data)).use { it.readBytes() }

    fun canSync(): Boolean = dailyBytesUsed < MAX_DAILY_BYTES

    @Synchronized
    fun recordUsage(bytes: Long) {
        if (bytes > 0) dailyBytesUsed += bytes
    }

    fun bytesUsedToday(): Long = dailyBytesUsed

    @Synchronized
    fun resetDailyBudget() {
        dailyBytesUsed = 0L
    }

    private fun selectBatch(): List<SyncableEntity> = synchronized(this) {
        val ready = pendingChanges.filter {
            it.syncStatus == SyncStatus.PENDING || it.syncStatus == SyncStatus.CONFLICT
        }
        val regular = ready.filter { it.entityType != ENTITY_PHOTO }
        val photos = ready.filter { it.entityType == ENTITY_PHOTO }

        photos.forEach { photo ->
            if (estimatePhotoSize(photo) > MAX_PHOTO_SIZE_BYTES) {
                markStatus(photo.id, SyncStatus.FAILED)
            }
        }
        val eligiblePhotos = photos.filter { estimatePhotoSize(it) <= MAX_PHOTO_SIZE_BYTES }
        val batchedPhotos = if (eligiblePhotos.size >= BATCH_PHOTO_THRESHOLD) eligiblePhotos else emptyList()

        (regular + batchedPhotos).take(MAX_BATCH_SIZE)
    }

    private fun upsertRemote(remote: SyncableEntity) = synchronized(this) {
        pendingChanges.removeAll { it.id == remote.id && it.entityType == remote.entityType }
        pendingChanges.add(remote.withStatus(SyncStatus.SYNCED))
    }

    private fun removeFromQueue(entityId: String) = synchronized(this) {
        pendingChanges.removeAll { it.id == entityId }
        entityForChangeId.values.removeAll { it == entityId }
    }

    private fun markStatus(entityId: String, status: SyncStatus) = synchronized(this) {
        val index = pendingChanges.indexOfFirst { it.id == entityId }
        if (index >= 0) {
            pendingChanges[index] = pendingChanges[index].withStatus(status)
        }
    }

    private fun estimateWireSize(entity: SyncableEntity): Long =
        BASE_ENTITY_WIRE_BYTES + entity.id.length + entity.entityType.length

    private fun estimatePhotoSize(entity: SyncableEntity): Long =
        estimateWireSize(entity) + entity.localVersion * 1024L

    private fun elapsedSince(startedAt: Long): Long = System.currentTimeMillis() - startedAt

    private fun SyncableEntity.withStatus(status: SyncStatus): SyncableEntity =
        StatusOverriddenEntity(this, status)
}

private data class StatusOverriddenEntity(
    private val delegate: SyncableEntity,
    override val syncStatus: SyncStatus
) : SyncableEntity {
    override val id: String get() = delegate.id
    override val entityType: String get() = delegate.entityType
    override val localVersion: Long get() = delegate.localVersion
    override val remoteVersion: Long get() = delegate.remoteVersion
    override val lastModified: Instant get() = delegate.lastModified
}
