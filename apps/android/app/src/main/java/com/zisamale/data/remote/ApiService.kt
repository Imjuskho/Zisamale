package com.zisamale.data.remote

import com.zisamale.BuildConfig
import com.zisamale.data.session.SessionStore
import okhttp3.Interceptor
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

data class LoginRequest(
    val username: String,
    val password: String
)

data class AuthUserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val district: String? = null,
    val chw_id: String? = null
)

data class TokenResponse(
    val access_token: String,
    val token_type: String? = null,
    val role: String,
    val user_id: String,
    val chw_id: String? = null,
    val district_id: String? = null,
    val user: AuthUserDto? = null
)

data class VisitSyncRequest(
    val visit_id: String,
    val household_id: String,
    val chw_id: String,
    val visit_date: String,
    val pregnancy_id: String? = null,
    val child_id: String? = null,
    val visit_type: String,
    val symptoms: List<String> = emptyList(),
    val danger_signs: List<String> = emptyList(),
    val measurements: Map<String, Any> = emptyMap(),
    val ai_recommendation: Map<String, Any>? = null,
    val ai_risk_score: Float? = null,
    val chw_override: Boolean = false,
    val chw_override_reason: String? = null,
    val chw_notes: String? = null,
    val gps_lat: Double? = null,
    val gps_lon: Double? = null
)

data class VisitSyncResponse(
    val visit_id: String,
    val sync_status: String,
    val created: Boolean? = null
)

data class ReferralSyncRequest(
    val referral_id: String,
    val visit_id: String,
    val patient_id: String,
    val referral_reason: String,
    val urgency: String,
    val selected_facility_id: String?,
    val chw_id: String
)

data class ReferralSyncResponse(
    val referral_id: String,
    val referral_code: String
)

data class PriorityVisitDto(
    val household_id: String,
    val household_name: String,
    val visit_type: String,
    val risk_score: Double,
    val risk_category: String,
    val due_date: String? = null,
    val overdue_days: Int = 0,
    val top_risk_factors: List<String> = emptyList(),
    val distance_km: Double = 0.0
)

data class PriorityListResponse(
    val visits: List<PriorityVisitDto> = emptyList()
)

data class ModelTelemetryRecordDto(
    val kind: String,
    val model_version: String,
    val source: String,
    val inference_count: Long,
    val fallback_count: Long,
    val latency_ms_avg: Double?,
    val app_version: String? = null
)

data class ModelTelemetryBatch(
    val records: List<ModelTelemetryRecordDto> = emptyList()
)

data class TelemetryAck(
    val accepted: Int
)

data class HouseholdSyncPayload(
    val household_id: String,
    val gps_lat: Double? = null,
    val gps_lon: Double? = null,
    val ta_name: String? = null,
    val village_name: String? = null,
    val water_source: String? = null,
    val sanitation_type: String? = null,
    val food_security_score: Int? = null,
    val distance_to_facility_km: Double? = null,
    val transport_cost_mwk: Double? = null,
    val household_size: Int? = null,
    val last_updated: Long? = null
)

data class HouseholdBatchRequest(
    val device_id: String?,
    val chw_id: String,
    val households: List<HouseholdSyncPayload> = emptyList()
)

data class HouseholdSyncConflict(
    val type: String,
    val id: String?,
    val reason: String
)

data class HouseholdSyncReceipt(
    val processed: Int,
    val created: Int,
    val updated: Int,
    val conflicts: List<HouseholdSyncConflict> = emptyList(),
    val sync_timestamp: String
)

interface ZisamaleApi {
    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): TokenResponse

    @POST("api/v1/visits")
    suspend fun submitVisit(@Body visit: VisitSyncRequest): Response<VisitSyncResponse>

    @GET("api/v1/chw/{chwId}/priority-list")
    suspend fun getPriorityList(@Path("chwId") chwId: String): PriorityListResponse

    @POST("api/v1/referrals")
    suspend fun createReferral(@Body referral: ReferralSyncRequest): Response<ReferralSyncResponse>

    @POST("api/v1/ml/telemetry")
    suspend fun postTelemetry(@Body batch: ModelTelemetryBatch): Response<TelemetryAck>

    @POST("api/v1/households/batch")
    suspend fun syncHouseholds(@Body body: HouseholdBatchRequest): Response<HouseholdSyncReceipt>

    @Multipart
    @POST("api/v1/photos")
    suspend fun uploadPhoto(
        @Part file: MultipartBody.Part,
        @Part("visit_id") visitId: okhttp3.RequestBody?
    ): Response<PhotoUploadResponse>
}

data class PhotoUploadResponse(
    val status: String,
    val file_id: String?,
    val sha256: String? = null,
    val size_bytes: Long? = null
)

/**
 * Offline-tolerant queue for edge inference stats; drained opportunistically
 * during sync. Telemetry is best-effort by design — losing it never blocks
 * clinical work (Principle 2).
 */
object TelemetryBuffer {
    private const val MAX_QUEUED = 500
    private val queue = java.util.concurrent.ConcurrentLinkedQueue<ModelTelemetryRecordDto>()

    fun enqueue(record: ModelTelemetryRecordDto) {
        if (queue.size < MAX_QUEUED) queue.add(record)
    }

    fun size(): Int = queue.size

    /** Drains up to 100 records per attempt; failures re-queue for next sync. */
    suspend fun flush(api: ZisamaleApi) {
        while (true) {
            val batch = mutableListOf<ModelTelemetryRecordDto>()
            while (batch.size < 100) {
                val record = queue.poll() ?: break
                batch.add(record)
            }
            if (batch.isEmpty()) return
            try {
                api.postTelemetry(ModelTelemetryBatch(batch))
            } catch (_: Exception) {
                queue.addAll(batch)
                return
            }
        }
    }
}

class ApiClient(
    private val sessionStore: SessionStore,
    baseUrl: String = DEFAULT_BASE_URL
) {
    val instance: ZisamaleApi

    init {
        val auth = Interceptor { chain ->
            val token = sessionStore.token
            val request = if (token.isNullOrBlank()) {
                chain.request()
            } else {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            }
            chain.proceed(request)
        }
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(auth)
            .addInterceptor(logging)
            .build()
        instance = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ZisamaleApi::class.java)
    }

    companion object {
        const val DEFAULT_BASE_URL = BuildConfig.API_BASE_URL
    }
}
