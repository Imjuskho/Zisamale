package com.zisamale.sync

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.zisamale.data.local.ZisamaleDatabase
import com.zisamale.util.FollowUpPolicy
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * 48h arrival follow-up (M4): one-shot worker per emergency/urgent referral.
 * Fires with no network constraint; if the facility has not recorded arrival,
 * the CHW is prompted to chase the patient up.
 */
@HiltWorker
class FollowUpWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val db: ZisamaleDatabase
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val referralId = inputData.getString(KEY_REFERRAL_ID) ?: return Result.success()
        val referral = db.referralDao().getById(referralId) ?: return Result.success()
        if (!FollowUpPolicy.isDue(referral.created_at, referral.patient_arrived, referral.outcome, System.currentTimeMillis())) {
            return Result.success()
        }
        NotificationHelper.showReferralFollowUp(applicationContext, referral.referral_code)
        return Result.success()
    }

    companion object {
        const val KEY_REFERRAL_ID = "referral_id"
        private const val WORK_PREFIX = "followup-"

        fun schedule(context: Context, referralId: String) {
            val request = OneTimeWorkRequestBuilder<FollowUpWorker>()
                .setInputData(androidx.work.workDataOf(KEY_REFERRAL_ID to referralId))
                .setInitialDelay(FollowUpPolicy.FOLLOW_UP_AFTER_MS, TimeUnit.MILLISECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "$WORK_PREFIX$referralId",
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}

object NotificationHelper {

    private const val CHANNEL_ID = "referral_followups"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Referral follow-ups",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Reminders to confirm referred patients arrived at the facility" }
        )
    }

    fun canNotify(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun showReferralFollowUp(context: Context, referralCode: String) {
        if (!canNotify(context)) return
        ensureChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("Referral $referralCode - did the patient arrive?")
            .setContentText("48h since referral. Confirm arrival at the facility or follow up by phone.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        manager.notify(referralCode.hashCode(), notification)
    }
}
