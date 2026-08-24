package com.zisamale.util

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.CancellationSignal
import androidx.core.location.LocationManagerCompat
import java.util.concurrent.Executor
import java.util.concurrent.Executors

data class GpsFix(val lat: Double, val lon: Double, val accuracyM: Float?, val capturedAt: Long = System.currentTimeMillis())

/**
 * Offline-safe GPS capture for household registration. Uses the platform
 * LocationManager directly so it works on devices without Google Play
 * Services and with zero connectivity.
 */
object LocationHelper {

    private val executor: Executor = Executors.newSingleThreadExecutor()

    private fun providers(manager: LocationManager) = buildList {
        add(LocationManager.FUSED_PROVIDER)
        add(LocationManager.GPS_PROVIDER)
        add(LocationManager.NETWORK_PROVIDER)
    }.filter { manager.allProviders.contains(it) }

    /** Last-known fix from any provider; null when none is fresh enough. */
    @SuppressLint("MissingPermission")
    fun lastKnown(context: Context, maxAgeMs: Long = 10 * 60 * 1000L): GpsFix? {
        if (!hasPermission(context)) return null
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        return providers(manager)
            .asSequence()
            .mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
            .filter { System.currentTimeMillis() - it.time <= maxAgeMs }
            .maxByOrNull { it.time }
            ?.toFix()
    }

    /**
     * Requests one fresh fix. Falls back to lastKnown when the provider is
     * disabled or the device cannot produce a fix quickly.
     */
    @SuppressLint("MissingPermission")
    fun getCurrent(
        context: Context,
        timeoutMs: Long = 15_000,
        onResult: (GpsFix?, String?) -> Unit
    ) {
        if (!hasPermission(context)) {
            onResult(null, "Location permission not granted")
            return
        }
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (manager == null || !manager.isLocationEnabled || providers(manager).isEmpty()) {
            onResult(lastKnown(context), "Location services are off")
            return
        }

        val signal = CancellationSignal()
        var settled = false
        fun settle(fix: GpsFix?, error: String?) {
            if (settled) return
            settled = true
            signal.cancel()
            onResult(fix, error)
        }

        // Safety net so the CHW is never left waiting on an open sky.
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            settle(lastKnown(context), "GPS timed out; used last known location")
        }, timeoutMs)

        try {
            LocationManagerCompat.getCurrentLocation(
                manager,
                providers(manager).first(),
                signal,
                executor
            ) { location ->
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    settle(location?.toFix(), null)
                }
            }
        } catch (e: Exception) {
            settle(lastKnown(context), "Could not get a fresh fix; used last known location")
        }
    }

    fun hasPermission(context: Context): Boolean =
        androidx.core.content.ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
            androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

    private fun Location.toFix() = GpsFix(lat = latitude, lon = longitude, accuracyM = accuracy.takeIf { it > 0f })
}
