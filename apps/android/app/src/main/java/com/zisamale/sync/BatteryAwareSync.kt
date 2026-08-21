package com.zisamale.sync

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import com.zisamale.data.sync.SyncManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

enum class NetworkQuality { NONE, SLOW_CELLULAR, CELLULAR, WIFI }

/**
 * Gates all background syncing on device conditions:
 *  - battery above [MIN_BATTERY_PERCENT] unless charging
 *  - WiFi or usable cellular (>= ~3G) connectivity
 *  - full opportunistic sync every [AUTO_SYNC_INTERVAL] while idle and charging
 */
@Singleton
class BatteryAwareSync @Inject constructor(
    @ApplicationContext private val context: Context,
    private val legacySync: SyncManager
) {
    companion object {
        const val MIN_BATTERY_PERCENT = 50
        val AUTO_SYNC_INTERVAL: Duration = Duration.ofHours(6)
        val CHECK_INTERVAL: Duration = Duration.ofMinutes(15)
        private const val MIN_CELLULAR_KBPS = 384 // rough 3G floor
    }

    private val engine = SyncEngineImpl()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var lastAutoSync: Instant = Instant.EPOCH
    private var loopJob: Job? = null

    fun start() {
        if (loopJob?.isActive == true) return
        loopJob = scope.launch {
            while (isActive) {
                maybeAutoSync()
                delay(CHECK_INTERVAL.toMillis())
            }
        }
    }

    fun stop() {
        loopJob?.cancel()
        loopJob = null
    }

    fun destroy() {
        stop()
        scope.cancel()
    }

    fun batteryLevel(): Int {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val level = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
        if (level in 1..100) return level
        val sticky: Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val rawLevel = sticky?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = sticky?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (rawLevel >= 0 && scale > 0) (rawLevel * 100) / scale else 0
    }

    fun isCharging(): Boolean {
        val sticky: Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val status = sticky?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val plugged = sticky?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL ||
            plugged != 0
    }

    fun networkQuality(): NetworkQuality {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return NetworkQuality.NONE
        val network = cm.activeNetwork ?: return NetworkQuality.NONE
        val capabilities = cm.getNetworkCapabilities(network) ?: return NetworkQuality.NONE
        if (!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
            return NetworkQuality.NONE
        }
        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkQuality.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ->
                if (capabilities.linkDownstreamBandwidthKbps >= MIN_CELLULAR_KBPS) {
                    NetworkQuality.CELLULAR
                } else {
                    NetworkQuality.SLOW_CELLULAR
                }
            else -> NetworkQuality.NONE
        }
    }

    /** Sync is allowed when the radio is usable AND the device has power headroom. */
    fun shouldSync(): Boolean {
        val networkOk = when (networkQuality()) {
            NetworkQuality.WIFI, NetworkQuality.CELLULAR -> true
            else -> false
        }
        if (!networkOk) return false
        return isCharging() || batteryLevel() > MIN_BATTERY_PERCENT
    }

    suspend fun syncIfEligible(force: Boolean = false): Boolean {
        if (!force && !shouldSync()) return false
        runCatching { legacySync.syncAll() }
        engine.pushDelta()
        engine.pullDelta(lastAutoSync)
        lastAutoSync = Instant.now()
        return true
    }

    suspend fun maybeAutoSync(): Boolean {
        val dueForCycle = Duration.between(lastAutoSync, Instant.now()) >= AUTO_SYNC_INTERVAL
        val idleAndCharging = isCharging() && batteryLevel() > MIN_BATTERY_PERCENT &&
            networkQuality() == NetworkQuality.WIFI
        if (!dueForCycle || !idleAndCharging) return false
        return syncIfEligible(force = true)
    }

    fun queueChange(entity: SyncableEntity): LocalChangeId = engine.queueChange(entity)

    fun engineStatus(entityId: String): SyncStatus? = engine.statusOf(entityId)
}
