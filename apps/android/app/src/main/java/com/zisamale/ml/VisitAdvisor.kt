package com.zisamale.ml

import com.zisamale.data.local.ChildEntity
import com.zisamale.data.local.HouseholdEntity
import com.zisamale.data.local.PregnancyEntity
import com.zisamale.domain.model.RiskLevel
import com.zisamale.domain.model.RiskScoreResult

data class VisitAdvice(
    val pregnancyId: String? = null,
    val childId: String? = null,
    val score: RiskScoreResult,
    val action: String,
    val modelVersion: String = VisitAdvisor.MODEL_VERSION
) {
    fun toRecommendationMap(): Map<String, Any> = mapOf(
        "risk_score" to score.riskScore,
        "risk_category" to score.riskCategory.name.lowercase(),
        "top_factors" to score.topFactors,
        "action" to action,
        "model_version" to modelVersion
    )
}

object VisitAdvisor {
    const val MODEL_VERSION = "rule-based-v1"

    fun advise(
        visitType: String,
        household: HouseholdEntity?,
        pregnancy: PregnancyEntity?,
        child: ChildEntity?,
        dangerSigns: Collection<String>
    ): VisitAdvice {
        val signs = dangerSigns.toList()
        return when (visitType) {
            "pregnancy" -> {
                val base = RiskScorer.scorePregnancy(
                    age = pregnancy?.age,
                    parity = pregnancy?.parity ?: 0,
                    priorStillbirths = pregnancy?.prior_stillbirths ?: 0,
                    priorCsections = pregnancy?.prior_csections ?: 0,
                    bpSystolic = pregnancy?.bp_systolic,
                    bpDiastolic = pregnancy?.bp_diastolic,
                    hemoglobin = pregnancy?.hemoglobin,
                    foodSecurityScore = household?.food_security_score,
                    distanceKm = household?.distance_to_facility_km?.toFloat()
                )
                val scored = applyDangerSigns(base, signs)
                VisitAdvice(
                    pregnancyId = pregnancy?.pregnancy_id,
                    score = scored,
                    action = recommendedAction(scored, signs)
                )
            }
            "child" -> {
                val base = RiskScorer.scoreChild(
                    ageMonths = null,
                    muac = child?.muac,
                    weightKg = child?.weight_kg,
                    heightCm = child?.height_cm,
                    hasFever = signs.any { it.contains("Fever", ignoreCase = true) },
                    hasCough = signs.any { it.contains("breathing", ignoreCase = true) },
                    hasDiarrhea = false,
                    dangerSigns = signs
                )
                VisitAdvice(
                    childId = child?.child_id,
                    score = base,
                    action = recommendedAction(base, signs)
                )
            }
            else -> VisitAdvice(
                score = RiskScoreResult(0f, RiskLevel.LOW, emptyList()),
                action = "continue_routine"
            )
        }
    }

    private fun applyDangerSigns(base: RiskScoreResult, signs: List<String>): RiskScoreResult {
        if (signs.isEmpty()) return base
        val score = (base.riskScore + 3.0f).coerceAtMost(10f)
        val category = when {
            score <= 3.0f -> RiskLevel.LOW
            score <= 6.0f -> RiskLevel.MEDIUM
            score <= 8.0f -> RiskLevel.HIGH
            else -> RiskLevel.CRITICAL
        }
        val factors = (listOf("Danger signs reported: ${signs.take(2).joinToString()}") + base.topFactors).take(3)
        return RiskScoreResult(score, category, factors)
    }

    fun recommendedAction(score: RiskScoreResult, dangerSigns: Collection<String>): String {
        if (dangerSigns.isNotEmpty() || score.riskCategory == RiskLevel.CRITICAL || score.riskCategory == RiskLevel.HIGH) {
            return "immediate_referral"
        }
        if (score.riskCategory == RiskLevel.MEDIUM) return "priority_followup"
        return "continue_anc"
    }
}
