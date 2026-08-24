package com.zisamale.data.local

import androidx.room.*

@Entity(tableName = "households")
data class HouseholdEntity(
    @PrimaryKey val household_id: String,
    val chw_id: String,
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
    val sync_status: String = "pending",
    val last_updated: Long = System.currentTimeMillis()
)

@Entity(tableName = "pregnancies")
data class PregnancyEntity(
    @PrimaryKey val pregnancy_id: String,
    val household_id: String,
    val woman_name: String? = null,
    val age: Int? = null,
    val parity: Int = 0,
    val gravida: Int = 1,
    val lmp_date: String? = null,
    val edd_date: String? = null,
    val prior_stillbirths: Int = 0,
    val prior_csections: Int = 0,
    val prior_pph: Int = 0,
    val hiv_status: String? = null,
    val bp_systolic: Int? = null,
    val bp_diastolic: Int? = null,
    val hemoglobin: Float? = null,
    val danger_signs: String = "[]",
    val risk_score: Float? = null,
    val risk_category: String = "low",
    val top_risk_factors: String = "[]",
    val next_visit_date: String? = null,
    val referral_needed: Boolean = false,
    val referral_facility_id: String? = null,
    val referral_status: String? = null,
    val is_active: Boolean = true,
    val chw_id: String = "",
    val sync_status: String = "pending",
    val last_updated: Long = System.currentTimeMillis()
)

@Entity(tableName = "children")
data class ChildEntity(
    @PrimaryKey val child_id: String,
    val household_id: String,
    val child_name: String? = null,
    val dob: String? = null,
    val sex: String? = null,
    val birth_weight_kg: Float? = null,
    val muac: Float? = null,
    val weight_kg: Float? = null,
    val height_cm: Float? = null,
    val danger_signs: String = "[]",
    val symptoms: String = "[]",
    val risk_score: Float? = null,
    val risk_category: String = "low",
    val top_risk_factors: String = "[]",
    val iccm_category: String = "uncomplicated",
    val treatment_given: String? = null,
    val referral_needed: Boolean = false,
    val sync_status: String = "pending",
    val last_updated: Long = System.currentTimeMillis()
)

@Entity(tableName = "visits")
data class VisitEntity(
    @PrimaryKey val visit_id: String,
    val household_id: String,
    val chw_id: String,
    val visit_date: Long,
    val pregnancy_id: String? = null,
    val child_id: String? = null,
    val visit_type: String,
    val symptoms: String = "[]",
    val danger_signs: String = "[]",
    val measurements: String = "{}",
    val ai_recommendation: String? = null,
    val ai_risk_score: Float? = null,
    val chw_override: Boolean = false,
    val chw_override_reason: String? = null,
    val chw_notes: String? = null,
    val gps_lat: Double? = null,
    val gps_lon: Double? = null,
    val photos_queued: Int = 0,
    val sync_status: String = "pending"
)

@Entity(tableName = "referrals")
data class ReferralEntity(
    @PrimaryKey val referral_id: String,
    val visit_id: String,
    val patient_id: String,
    val patient_type: String,
    val referral_reason: String,
    val urgency: String = "routine",
    val recommended_facilities: String = "[]",
    val selected_facility_id: String? = null,
    val chw_id: String,
    val referral_code: String,
    val facility_notified: Boolean = false,
    val patient_arrived: Boolean = false,
    val outcome: String? = null,
    val status: String = "pending",
    val created_at: Long = System.currentTimeMillis()
)

@Entity(tableName = "photo_queue")
data class PhotoEntity(
    @PrimaryKey val photo_id: String,
    val visit_id: String,
    /** Absolute path of the compressed JPEG staged under filesDir/photos. */
    val local_path: String,
    val remote_file_id: String? = null,
    val bytes: Long = 0,
    val sync_status: String = "pending",
    val created_at: Long = System.currentTimeMillis()
)
