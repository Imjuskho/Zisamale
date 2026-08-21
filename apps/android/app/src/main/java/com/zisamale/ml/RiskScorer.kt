package com.zisamale.ml

import com.zisamale.domain.model.RiskLevel
import com.zisamale.domain.model.RiskScoreResult

object RiskScorer {
    private val featureWeights = mapOf(
        "age_under_18" to 1.5f,
        "age_over_35" to 1.0f,
        "first_pregnancy" to 1.2f,
        "prior_stillbirth" to 2.0f,
        "prior_csection" to 1.0f,
        "bp_high_systolic" to 2.5f,
        "bp_high_diastolic" to 2.0f,
        "hemoglobin_low" to 2.0f,
        "food_insecure" to 1.0f,
        "far_from_facility" to 1.5f
    )

    fun scorePregnancy(
        age: Int?,
        parity: Int,
        priorStillbirths: Int,
        priorCsections: Int,
        bpSystolic: Int?,
        bpDiastolic: Int?,
        hemoglobin: Float?,
        foodSecurityScore: Int?,
        distanceKm: Float?
    ): RiskScoreResult {
        var score = 0f
        val factors = mutableListOf<String>()

        if (age != null && age < 18) {
            score += featureWeights["age_under_18"]!!
            factors.add("Age under 18")
        }
        if (age != null && age > 35) {
            score += featureWeights["age_over_35"]!!
            factors.add("Age over 35")
        }
        if (parity == 0) {
            score += featureWeights["first_pregnancy"]!!
            factors.add("First pregnancy (no prior ANC)")
        }
        if (priorStillbirths > 0) {
            score += featureWeights["prior_stillbirth"]!!
            factors.add("History of stillbirth ($priorStillbirths)")
        }
        if (priorCsections > 0) {
            score += featureWeights["prior_csection"]!!
            factors.add("Prior C-section ($priorCsections)")
        }
        if (bpSystolic != null && bpSystolic > 140) {
            score += featureWeights["bp_high_systolic"]!!
            factors.add("High systolic BP ($bpSystolic)")
        }
        if (bpDiastolic != null && bpDiastolic > 90) {
            score += featureWeights["bp_high_diastolic"]!!
            factors.add("High diastolic BP ($bpDiastolic)")
        }
        if (hemoglobin != null && hemoglobin < 8.0f) {
            score += featureWeights["hemoglobin_low"]!!
            factors.add("Low hemoglobin (${hemoglobin}g/dL)")
        }
        if (foodSecurityScore != null && foodSecurityScore <= 2) {
            score += featureWeights["food_insecure"]!!
            factors.add("Food insecure (score: $foodSecurityScore)")
        }
        if (distanceKm != null && distanceKm > 10) {
            score += featureWeights["far_from_facility"]!!
            factors.add("Far from facility (${distanceKm}km)")
        }

        score = score.coerceIn(0f, 10f)

        val category = when {
            score <= 3.0f -> RiskLevel.LOW
            score <= 6.0f -> RiskLevel.MEDIUM
            score <= 8.0f -> RiskLevel.HIGH
            else -> RiskLevel.CRITICAL
        }

        return RiskScoreResult(
            riskScore = score,
            riskCategory = category,
            topFactors = factors.sortedByDescending { factor ->
                featureWeights.entries.find { it.value.toString() == factor.substringAfter("(") }?.value ?: 0f
            }.take(3)
        )
    }

    fun scoreChild(
        ageMonths: Int?,
        muac: Float?,
        weightKg: Float?,
        heightCm: Float?,
        hasFever: Boolean,
        hasCough: Boolean,
        hasDiarrhea: Boolean,
        dangerSigns: List<String>
    ): RiskScoreResult {
        var score = 0f
        val factors = mutableListOf<String>()

        if (dangerSigns.isNotEmpty()) {
            score += 5.0f
            factors.add("Danger signs present: ${dangerSigns.joinToString()}")
        }
        if (muac != null && muac < 11.5f) {
            score += 3.0f
            factors.add("Severe acute malnutrition (MUAC: ${muac}cm)")
        } else if (muac != null && muac < 12.5f) {
            score += 1.5f
            factors.add("Moderate acute malnutrition (MUAC: ${muac}cm)")
        }
        if (hasFever) {
            score += 1.0f
            factors.add("Fever present")
        }
        if (hasCough && hasDiarrhea) {
            score += 1.5f
            factors.add("Multiple symptoms (cough + diarrhea)")
        }
        if (ageMonths != null && ageMonths < 6) {
            score += 0.5f
            factors.add("Infant under 6 months")
        }

        score = score.coerceIn(0f, 10f)

        val category = when {
            score <= 3.0f -> RiskLevel.LOW
            score <= 6.0f -> RiskLevel.MEDIUM
            score <= 8.0f -> RiskLevel.HIGH
            else -> RiskLevel.CRITICAL
        }

        return RiskScoreResult(
            riskScore = score,
            riskCategory = category,
            topFactors = factors.take(3)
        )
    }
}
