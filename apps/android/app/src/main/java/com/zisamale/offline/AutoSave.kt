package com.zisamale.offline

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.net.URLDecoder
import java.net.URLEncoder

/** Pluggable persistence so drafts survive process death. */
interface AutoSaveStore {
    fun write(formId: String, snapshot: String)
    fun read(formId: String): String?
    fun delete(formId: String)
}

class SharedPreferencesAutoSaveStore(context: Context) : AutoSaveStore {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("autosave_drafts", Context.MODE_PRIVATE)

    override fun write(formId: String, snapshot: String) {
        prefs.edit().putString(formId, snapshot).apply()
    }

    override fun read(formId: String): String? = prefs.getString(formId, null)

    override fun delete(formId: String) {
        prefs.edit().remove(formId).apply()
    }
}

/**
 * Crash/offline-safe form drafts:
 *  - captures every keystroke into an in-memory draft and marks the field dirty
 *  - flushes dirty fields to [AutoSaveStore] every [AUTO_SAVE_INTERVAL_MS] (30s)
 *  - [recover] restores the last persisted snapshot after restart
 */
class AutoSave(
    private val store: AutoSaveStore,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
    private val intervalMillis: Long = AUTO_SAVE_INTERVAL_MS
) {
    companion object {
        const val AUTO_SAVE_INTERVAL_MS = 30_000L // 30 seconds
        private const val ENTRY_SEPARATOR = "\u0001"
        private const val KEY_VALUE_SEPARATOR = "\u0002"
        private const val CHARSET = "UTF-8"
    }

    private val drafts = HashMap<String, HashMap<String, String>>()
    private val dirtyFields = HashMap<String, HashSet<String>>()
    private val mutex = Mutex()
    private var flushJob: Job? = null

    suspend fun onFieldChanged(formId: String, field: String, value: String) = mutex.withLock {
        drafts.getOrPut(formId) { HashMap() }[field] = value
        dirtyFields.getOrPut(formId) { HashSet() }.add(field)
    }

    suspend fun fieldValue(formId: String, field: String): String? = mutex.withLock {
        drafts[formId]?.get(field)
    }

    suspend fun dirtyFields(formId: String): Set<String> = mutex.withLock {
        dirtyFields[formId].orEmpty().toSet()
    }

    suspend fun saveNow(formId: String): Boolean {
        val snapshot = mutex.withLock {
            val dirty = dirtyFields[formId].orEmpty()
            if (dirty.isEmpty()) return false
            serialize(formId, dirty)
        }
        store.write(formId, snapshot)
        mutex.withLock { dirtyFields.remove(formId) }
        return true
    }

    /** Restores the last persisted snapshot; returns saved field -> value pairs. */
    fun recover(formId: String): Map<String, String> {
        val raw = store.read(formId) ?: return emptyMap()
        return deserialize(raw)
    }

    /** Loads a recovered snapshot back into the live draft (fields stay clean until edited). */
    suspend fun restoreIntoDraft(formId: String) {
        val recovered = recover(formId)
        if (recovered.isEmpty()) return
        mutex.withLock {
            drafts.getOrPut(formId) { HashMap() }.putAll(recovered)
            dirtyFields.remove(formId)
        }
    }

    suspend fun discard(formId: String) {
        mutex.withLock {
            drafts.remove(formId)
            dirtyFields.remove(formId)
        }
        store.delete(formId)
    }

    fun start() {
        if (flushJob?.isActive == true) return
        flushJob = scope.launch {
            while (isActive) {
                delay(intervalMillis)
                runCatching { saveAllDirty() }
            }
        }
    }

    fun stop() {
        flushJob?.cancel()
        flushJob = null
    }

    fun destroy() {
        stop()
        scope.cancel()
    }

    suspend fun saveAllDirty(): Int {
        val formIds = mutex.withLock { dirtyKeysLocked() }
        var saved = 0
        for (formId in formIds) {
            if (saveNow(formId)) saved++
        }
        return saved
    }

    private fun dirtyKeysLocked(): List<String> = dirtyFields.keys.toList()

    private fun serialize(formId: String, dirty: Set<String>): String {
        val values = drafts[formId].orEmpty()
        return dirty.mapNotNull { field ->
            val value = values[field] ?: return@mapNotNull null
            encode(field) + KEY_VALUE_SEPARATOR + encode(value)
        }.joinToString(ENTRY_SEPARATOR)
    }

    private fun deserialize(raw: String): Map<String, String> =
        raw.split(ENTRY_SEPARATOR)
            .mapNotNull { entry ->
                val parts = entry.split(KEY_VALUE_SEPARATOR, limit = 2)
                if (parts.size != 2) return@mapNotNull null
                decode(parts[0]) to decode(parts[1])
            }
            .toMap()

    private fun encode(value: String): String = URLEncoder.encode(value, CHARSET)

    private fun decode(value: String): String = URLDecoder.decode(value, CHARSET)
}
