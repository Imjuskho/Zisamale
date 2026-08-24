package com.zisamale.util

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat

/**
 * Last-resort SMS channel for RED (emergency) referrals when data network is
 * unavailable (Principle 1: never let connectivity block urgent care).
 *
 * The destination number is a pilot-provisioned facility hotline constant;
 * wiring per-facility numbers from the registry is tracked in the backend
 * contract deltas.
 */
object SmsFallback {

    /** Pilot provisioning placeholder — replaced by facility registry lookup. */
    const val FACILITY_HOTLINE_MSISDN: String = "+265991000210"

    const val MAX_SMS_LENGTH = 160

    fun redMessage(
        referralCode: String,
        villageName: String?,
        facilityName: String?
    ): String {
        val base = "ZISAMALE RED REFERRAL $referralCode: " +
            (villageName?.let { "$it household " } ?: "Patient ") +
            "en route to ${facilityName ?: "facility"} - urgent care needed."
        return base.take(MAX_SMS_LENGTH)
    }

    fun canSend(context: Context): Boolean {
        val granted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.getSystemService(SmsManager::class.java) != null
        } else true
    }

    fun send(context: Context, msisdn: String, text: String): Boolean {
        if (!canSend(context)) return false
        return try {
            val manager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            } ?: return false
            manager.sendMultipartTextMessage(
                msisdn, null, manager.divideMessage(text), null, null
            )
            true
        } catch (_: Exception) {
            false
        }
    }
}

/**
 * Pure decision logic for the 48h arrival follow-up (kept JVM-testable).
 */
object FollowUpPolicy {

    const val FOLLOW_UP_AFTER_MS: Long = 48L * 60 * 60 * 1000

    fun isDue(
        createdAtMs: Long,
        patientArrived: Boolean,
        outcome: String?,
        nowMs: Long,
        followUpAfterMs: Long = FOLLOW_UP_AFTER_MS
    ): Boolean {
        if (patientArrived) return false
        if (!outcome.isNullOrBlank()) return false
        return nowMs - createdAtMs >= followUpAfterMs
    }
}
