package com.zisamale.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * Background opportunistic sync (Principle 1: sync is opportunistic, never
 * required). Runs when the device has any usable network and battery is not
 * low; the [BatteryAwareSync] gate applies its power/quality policy inside.
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val batteryAwareSync: BatteryAwareSync
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            val force = inputData.getBoolean(KEY_FORCE, false)
            val ran = batteryAwareSync.syncIfEligible(force = force)
            Result.success(workDataOf(KEY_RAN to ran))
        } catch (e: Exception) {
            if (runAttemptCount < MAX_RETRIES) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val KEY_RAN = "ran"
        const val KEY_FORCE = "force"
        private const val MAX_RETRIES = 3
        private const val PERIODIC_NAME = "zisamale-opportunistic-sync"
        private const val ONE_SHOT_NAME = "zisamale-kick-sync"

        /** Installed at app start; re-checked on every OS-allowed cycle. */
        fun schedulePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        /** Foreground-triggered nudge (after login / visit submit). */
        fun kickNow(context: Context, force: Boolean = false) {
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setInputData(workDataOf(KEY_FORCE to force))
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_SHOT_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}
