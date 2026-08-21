package com.zisamale.domain.model

data class Household(
    val householdId: String,
    val chwId: String,
    val gpsLat: Double? = null,
    val gpsLon: Double? = null,
    val taName: String? = null,
    val villageName: String? = null,
    val waterSource: String? = null,
    val sanitationType: String? = null,
    val foodSecurityScore: Int? = null,
    val distanceToFacilityKm: Double? = null,
    val transportCostMwk: Double? = null,
    val householdSize: Int? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

data class Pregnancy(
    val pregnancyId: String,
    val householdId: String,
    val womanName: String? = null,
    val age: Int? = null,
    val parity: Int = 0,
    val gravida: Int = 1,
    val lmpDate: String? = null,
    val eddDate: String? = null,
    val priorStillbirths: Int = 0,
    val priorCsections: Int = 0,
    val priorPph: Int = 0,
    val hivStatus: String? = null,
    val bpSystolic: Int? = null,
    val bpDiastolic: Int? = null,
    val hemoglobin: Float? = null,
    val dangerSigns: List<String> = emptyList(),
    val riskScore: Float? = null,
    val riskCategory: RiskLevel = RiskLevel.LOW,
    val topRiskFactors: List<String> = emptyList(),
    val nextVisitDate: String? = null,
    val referralNeeded: Boolean = false,
    val referralFacilityId: String? = null,
    val referralStatus: String? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

data class Child(
    val childId: String,
    val householdId: String,
    val childName: String? = null,
    val dob: String? = null,
    val sex: String? = null,
    val birthWeightKg: Float? = null,
    val muac: Float? = null,
    val weightKg: Float? = null,
    val heightCm: Float? = null,
    val dangerSigns: List<String> = emptyList(),
    val symptoms: List<String> = emptyList(),
    val riskScore: Float? = null,
    val riskCategory: RiskLevel = RiskLevel.LOW,
    val topRiskFactors: List<String> = emptyList(),
    val iccmCategory: String = "uncomplicated",
    val treatmentGiven: String? = null,
    val referralNeeded: Boolean = false,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

data class Visit(
    val visitId: String,
    val householdId: String,
    val chwId: String,
    val visitDate: String,
    val pregnancyId: String? = null,
    val childId: String? = null,
    val visitType: String,
    val symptoms: List<String> = emptyList(),
    val dangerSigns: List<String> = emptyList(),
    val measurements: Map<String, Any> = emptyMap(),
    val aiRecommendation: Map<String, Any>? = null,
    val aiRiskScore: Float? = null,
    val chwOverride: Boolean = false,
    val chwOverrideReason: String? = null,
    val chwNotes: String? = null,
    val gpsLat: Double? = null,
    val gpsLon: Double? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

data class Referral(
    val referralId: String,
    val visitId: String,
    val patientId: String,
    val patientType: String,
    val referralReason: String,
    val urgency: String = "routine",
    val recommendedFacilities: List<RecommendedFacility> = emptyList(),
    val selectedFacilityId: String? = null,
    val chwId: String,
    val referralCode: String,
    val facilityNotified: Boolean = false,
    val patientArrived: Boolean = false,
    val status: ReferralStatus = ReferralStatus.PENDING
)

data class RecommendedFacility(
    val facilityId: String,
    val facilityName: String,
    val distanceKm: Float,
    val stockStatus: Map<String, Any> = emptyMap(),
    val score: Float
)

data class RiskScoreResult(
    val riskScore: Float,
    val riskCategory: RiskLevel,
    val topFactors: List<String> = emptyList()
)

enum class RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }
enum class SyncStatus { PENDING, SYNCED, CONFLICT, FAILED }
enum class ReferralStatus { PENDING, IN_TRANSIT, COMPLETED, LOST_TO_FOLLOWUP }
