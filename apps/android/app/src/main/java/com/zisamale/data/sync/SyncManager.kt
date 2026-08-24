package com.zisamale.data.sync

import com.zisamale.data.local.ZisamaleDatabase
import com.zisamale.data.remote.LoginRequest
import com.zisamale.data.remote.PriorityVisitDto
import com.zisamale.data.remote.ReferralSyncRequest
import com.zisamale.data.remote.VisitSyncRequest
import com.zisamale.data.remote.ZisamaleApi
import com.zisamale.data.session.SessionStore
import com.zisamale.ui.screen.PriorityVisitItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class SyncManager(
    private val db: ZisamaleDatabase,
    private val api: ZisamaleApi,
    private val session: SessionStore
) {
    suspend fun login(username: String, password: String) = withContext(Dispatchers.IO) {
        val token = api.login(LoginRequest(username = username, password = password))
        session.token = token.access_token
        session.userId = token.user_id
        session.chwId = token.chw_id ?: token.user?.chw_id ?: token.user_id
        session.role = token.role
        session.displayName = token.user?.name ?: username
    }

    suspend fun fetchPriorityList(): List<PriorityVisitItem> = withContext(Dispatchers.IO) {
        val chwId = session.catchmentId()
        if (chwId.isBlank()) return@withContext emptyList()
        try {
            api.getPriorityList(chwId).visits.map { it.toItem() }
        } catch (_: Exception) {
            priorityFromLocalDb(chwId)
        }
    }

    suspend fun syncAll() {
        syncPendingHouseholds()
        syncPendingVisits()
        syncPendingReferrals()
        syncPendingPhotos()
        runCatching { com.zisamale.data.remote.TelemetryBuffer.flush(api) }
    }

    /**
     * Household registry upload (M2 contract delta). Households registered
     * offline go up in one batch when connectivity returns; the server
     * upserts by client UUID and reports per-item conflicts.
     */
    suspend fun syncPendingHouseholds() = withContext(Dispatchers.IO) {
        val pending = db.householdDao().getUnsynced()
        if (pending.isEmpty()) return@withContext
        try {
            val body = com.zisamale.data.remote.HouseholdBatchRequest(
                device_id = android.os.Build.DEVICE,
                chw_id = session.catchmentId(),
                households = pending.map { h ->
                    com.zisamale.data.remote.HouseholdSyncPayload(
                        household_id = h.household_id,
                        gps_lat = h.gps_lat,
                        gps_lon = h.gps_lon,
                        ta_name = h.ta_name,
                        village_name = h.village_name,
                        water_source = h.water_source,
                        sanitation_type = h.sanitation_type,
                        food_security_score = h.food_security_score,
                        distance_to_facility_km = h.distance_to_facility_km,
                        transport_cost_mwk = h.transport_cost_mwk,
                        household_size = h.household_size,
                        last_updated = h.last_updated
                    )
                }
            )
            val response = api.syncHouseholds(body)
            val newStatus = if (response.isSuccessful) "synced" else "failed"
            pending.forEach { db.householdDao().updateSyncStatus(it.household_id, newStatus) }
        } catch (_: Exception) {
            // Keep status pending; retried on the next opportunistic sync.
        }
    }

    /**
     * Photo queue upload (M4). Files were compressed at capture time; each
     * attempt streams one JPEG. Server errors mark the row failed so the next
     * opportunistic sync retries.
     */
    suspend fun syncPendingPhotos() = withContext(Dispatchers.IO) {
        val pending = db.photoDao().getUnsynced()
        for (photo in pending) {
            val file = java.io.File(photo.local_path)
            if (!file.exists()) {
                db.photoDao().updateSyncResult(photo.photo_id, "failed", null)
                continue
            }
            try {
                val mime = "image/jpeg"
                val part = okhttp3.MultipartBody.Part.createFormData(
                    "file",
                    file.name,
                    okhttp3.RequestBody.create("image/jpeg".toMediaTypeOrNull(), file)
                )
                val visitIdPart = okhttp3.RequestBody.create(
                    "text/plain".toMediaTypeOrNull(), photo.visit_id
                )
                val response = api.uploadPhoto(part, visitIdPart)
                if (response.isSuccessful) {
                    db.photoDao().updateSyncResult(
                        photo.photo_id, "synced", response.body()?.file_id
                    )
                } else {
                    db.photoDao().updateSyncResult(photo.photo_id, "failed", null)
                }
            } catch (_: Exception) {
                // Keep status pending; retried on the next opportunistic sync.
            }
        }
    }

    suspend fun syncPendingVisits() = withContext(Dispatchers.IO) {
        val pending = db.visitDao().getUnsynced()
        for (visit in pending) {
            try {
                val body = VisitSyncRequest(
                    visit_id = visit.visit_id,
                    household_id = visit.household_id,
                    chw_id = session.catchmentId(),
                    visit_date = isoUtc(visit.visit_date),
                    pregnancy_id = visit.pregnancy_id,
                    child_id = visit.child_id,
                    visit_type = visit.visit_type,
                    symptoms = parseStringList(visit.symptoms),
                    danger_signs = parseStringList(visit.danger_signs),
                    measurements = parseObjectMap(visit.measurements),
                    chw_override = visit.chw_override,
                    chw_override_reason = visit.chw_override_reason,
                    chw_notes = visit.chw_notes,
                    gps_lat = null,
                    gps_lon = null,
                    ai_risk_score = visit.ai_risk_score,
                    ai_recommendation = parseRecommendation(visit.ai_recommendation)
                )
                val response = api.submitVisit(body)
                if (response.isSuccessful) {
                    db.visitDao().updateSyncStatus(visit.visit_id, "synced")
                } else {
                    db.visitDao().updateSyncStatus(visit.visit_id, "failed")
                }
            } catch (_: Exception) {
                db.visitDao().updateSyncStatus(visit.visit_id, "failed")
            }
        }
    }

    suspend fun syncPendingReferrals() = withContext(Dispatchers.IO) {
        val pending = db.referralDao().getUnsynced()
        for (referral in pending) {
            try {
                val body = ReferralSyncRequest(
                    referral_id = referral.referral_id,
                    visit_id = referral.visit_id,
                    patient_id = referral.patient_id,
                    referral_reason = referral.referral_reason,
                    urgency = referral.urgency,
                    selected_facility_id = referral.selected_facility_id,
                    chw_id = session.catchmentId()
                )
                val response = api.createReferral(body)
                if (response.isSuccessful) {
                    db.referralDao().updateStatus(referral.referral_id, "synced")
                }
            } catch (_: Exception) {
                // Retry on the next opportunistic sync.
            }
        }
    }

    private suspend fun priorityFromLocalDb(chwId: String): List<PriorityVisitItem> {
        val pregnancies = db.pregnancyDao().getPrioritizedByChw(chwId)
        return pregnancies.map { pregnancy ->
            PriorityVisitItem(
                householdId = pregnancy.household_id,
                householdName = pregnancy.woman_name ?: pregnancy.household_id,
                visitType = "pregnancy",
                riskScore = pregnancy.risk_score ?: 0f,
                riskCategory = pregnancy.risk_category,
                overdueDays = 0,
                topRiskFactors = parseStringList(pregnancy.top_risk_factors),
                distanceKm = 0f
            )
        }
    }

    companion object {
        private fun isoUtc(epochMillis: Long): String {
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            fmt.timeZone = TimeZone.getTimeZone("UTC")
            return fmt.format(Date(epochMillis))
        }

        private fun parseStringList(raw: String): List<String> {
            return try {
                val arr = JSONArray(raw)
                List(arr.length()) { arr.optString(it) }
            } catch (_: Exception) {
                emptyList()
            }
        }

        private fun parseRecommendation(raw: String?): Map<String, Any>? {
            if (raw.isNullOrBlank() || raw == "{}") return null
            val obj = parseObjectMap(raw)
            if (obj.isEmpty()) return null
            val factors = obj["top_factors"]
            val normalized = obj.toMutableMap()
            if (factors is JSONArray) {
                normalized["top_factors"] = List(factors.length()) { factors.optString(it) }
            }
            return normalized
        }

        private fun parseObjectMap(raw: String): Map<String, Any> {
            return try {
                val obj = JSONObject(raw)
                obj.keys().asSequence().associateWith { key -> obj.get(key) }
            } catch (_: Exception) {
                emptyMap()
            }
        }

        private fun PriorityVisitDto.toItem() = PriorityVisitItem(
            householdId = household_id,
            householdName = household_name,
            visitType = visit_type,
            riskScore = risk_score.toFloat(),
            riskCategory = risk_category,
            overdueDays = overdue_days,
            topRiskFactors = top_risk_factors,
            distanceKm = distance_km.toFloat()
        )
    }
}
