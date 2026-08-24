package com.zisamale.monitoring

import com.zisamale.sync.NetworkQuality
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class MonitoringTest {

    // ---- CrashLog ------------------------------------------------------------

    @Test
    fun `crash formatting keeps class and truncates message`() {
        val boom = IllegalStateException("x".repeat(1000))
        val formatted = CrashLog.format(boom)
        assertTrue(formatted.startsWith("java.lang.IllegalStateException:"))
        assertTrue(formendedLengthIsCapped(formatted))
    }

    private fun formendedLengthIsCapped(s: String) = s.length < 400

    @Test
    fun `prune keeps the newest entries within the cap`() {
        val lines = (1..60).map { "entry-$it" }
        val pruned = CrashLog.prune(lines, maxEntries = 50)
        assertEquals(50, pruned.size)
        assertEquals("entry-11", pruned.first())
        assertEquals("entry-60", pruned.last())
        assertEquals(lines, CrashLog.prune(lines, maxEntries = 60))
    }

    // ---- BatteryDog ----------------------------------------------------------

    @Test
    fun `sampling is rate limited to one per interval`() {
        val t0 = Instant.parse("2026-01-01T00:00:00Z")
        assertTrue(BatteryDog.shouldSample(null, t0))
        assertFalse(
            BatteryDog.shouldSample(t0, t0.plus(BatteryDog.SAMPLE_MIN_INTERVAL).minusSeconds(1))
        )
        assertTrue(BatteryDog.shouldSample(t0, t0.plus(BatteryDog.SAMPLE_MIN_INTERVAL)))
    }

    @Test
    fun `ring buffer caps stored samples keeping the newest`() {
        var samples = emptyList<BatterySample>()
        val base = Instant.parse("2026-01-01T00:00:00Z")
        repeat(600) { i ->
            samples = BatteryDog.record(
                samples,
                BatterySample(base.plusSeconds(i * 60L), 50, false, NetworkQuality.NONE, false)
            )
        }
        assertEquals(BatteryDog.MAX_SAMPLES, samples.size)
        // Oldest 100 dropped; newest 500 retained.
        assertEquals(base.plusSeconds(100 * 60L), samples.first().at)
        assertEquals(base.plusSeconds(599 * 60L), samples.last().at)
    }
}
