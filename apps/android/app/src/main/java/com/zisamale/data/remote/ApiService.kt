package com.zisamale.data.remote

import com.zisamale.data.session.SessionStore
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
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

interface ZisamaleApi {
    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): TokenResponse

    @POST("api/v1/visits")
    suspend fun submitVisit(@Body visit: VisitSyncRequest): Response<VisitSyncResponse>

    @GET("api/v1/chw/{chwId}/priority-list")
    suspend fun getPriorityList(@Path("chwId") chwId: String): PriorityListResponse

    @POST("api/v1/referrals")
    suspend fun createReferral(@Body referral: ReferralSyncRequest): Response<ReferralSyncResponse>
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
        const val DEFAULT_BASE_URL = "http://10.0.2.2:8000/"
    }
}
