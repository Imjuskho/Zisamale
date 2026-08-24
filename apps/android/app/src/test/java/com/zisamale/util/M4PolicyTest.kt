package com.zisamale.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class M4PolicyTest {

    // ---- FollowUpPolicy ------------------------------------------------------

    private val created = 1_700_000_000_000L
    private val dueTime = created + FollowUpPolicy.FOLLOW_UP_AFTER_MS

    @Test
    fun `follow up becomes due after 48 hours`() {
        assertFalse(FollowUpPolicy.isDue(created, false, null, dueTime - 1))
        assertTrue(FollowUpPolicy.isDue(created, false, null, dueTime))
    }

    @Test
    fun `arrival or recorded outcome cancels the follow up`() {
        assertTrue(FollowUpPolicy.isDue(created, false, null, dueTime))
        assertFalse(FollowUpPolicy.isDue(created, true, null, dueTime + 10_000))
        assertFalse(FollowUpPolicy.isDue(created, false, "arrived_late", dueTime + 10_000))
        // Blank outcome strings mean nothing was recorded - follow-up still fires.
        assertTrue(FollowUpPolicy.isDue(created, false, "", dueTime))
    }

    // ---- SmsFallback ---------------------------------------------------------

    @Test
    fun `red message contains code destination and urgency`() {
        val text = SmsFallback.redMessage("REF-AB12CD34", "Makhanga", "Nsanje District Hospital")
        assertTrue(text.contains("REF-AB12CD34"))
        assertTrue(text.contains("Makhanga household"))
        assertTrue(text.contains("Nsanje District Hospital"))
        assertTrue(text.contains("urgent"))
        assertTrue(text.length <= SmsFallback.MAX_SMS_LENGTH)
    }

    @Test
    fun `red message falls back when village and facility are unknown`() {
        val text = SmsFallback.redMessage("REF-X", null, null)
        assertTrue(text.contains("Patient en route to facility"))
        assertTrue(text.length <= SmsFallback.MAX_SMS_LENGTH)
    }

    @Test
    fun `very long names are truncated to single sms length`() {
        val text = SmsFallback.redMessage("REF-LONGCODE9999", "V".repeat(300), "F".repeat(300))
        assertEquals(SmsFallback.MAX_SMS_LENGTH, text.length)
    }
}
