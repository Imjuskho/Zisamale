package com.zisamale.monitoring

import com.zisamale.sync.NetworkQuality
import java.time.Duration
import java.time.Instant

/**
 * Device-condition sampler for pilot diagnostics (M5). One row per sync gate
 * evaluation; the ring buffer is capped so a week offline cannot balloon the
 * encrypted store.
 */
data class BatterySample(
    val at: Instant,
    val batteryPercent: Int,
    val charging: Boolean,
    val network: NetworkQuality,
    val syncAllowed: Boolean
)

object BatteryDog {

    const val MAX_SAMPLES = 500
    val SAMPLE_MIN_INTERVAL: Duration = Duration.ofMinutes(10)

    /** Pure: should a new sample be recorded given the last one? */
    fun shouldSample(lastAt: Instant?, now: Instant): Boolean =
        lastAt == null || Duration.between(lastAt, now) >= SAMPLE_MIN_INTERVAL

    /** Pure: append with cap (JVM-tested). */
    fun record(samples: List<BatterySample>, sample: BatterySample, max: Int = MAX_SAMPLES): List<BatterySample> {
        val next = samples + sample
        return if (next.size <= max) next else next.takeLast(max)
    }
}
