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
    val modelVersion: String = VisitAdvisor.MODEL_VERSION,
    val chichewaFactors: List<String> = emptyList()
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
    const val EDGE_MODEL_VERSION = "edge-gbt-v${EdgeAI.MODEL_VERSION}"

    fun advise(
        visitType: String,
        household: HouseholdEntity?,
        pregnancy: PregnancyEntity?,
        child: ChildEntity?,
        dangerSigns: Collection<String>,
        edgeAi: EdgeAI? = null
    ): VisitAdvice {
        val signs = dangerSigns.toList()
        return when (visitType) {
            "pregnancy" -> {
                val scored = if (edgeAi?.isModelLoaded(ModelKind.PREGNANCY) == true) {
                    val features = floatArrayOf(
                        pregnancy?.age?.toFloat() ?: -1f,
                        (pregnancy?.parity ?: 0).toFloat(),
                        (pregnancy?.prior_stillbirths ?: 0).toFloat(),
                        (pregnancy?.prior_csections ?: 0).toFloat(),
                        pregnancy?.bp_systolic?.toFloat() ?: -1f,
                        pregnancy?.bp_diastolic?.toFloat() ?: -1f,
                        pregnancy?.hemoglobin?.toFloat() ?: -1f,
                        household?.food_security_score?.toFloat() ?: -1f,
                        household?.distance_to_facility_km?.toFloat() ?: -1f,
                        if (pregnancy?.hiv_status.equals("positive", ignoreCase = true)) 1f else 0f
                    )
                    val result = edgeAi.scorePregnancy(features)
                    RiskScoreResult(
                        riskScore = result.score,
                        riskCategory = result.category,
                        topFactors = result.topFactors.map { it.label }
                    ) to ChichewaExplainer.topRiskFactors(result, ModelKind.PREGNANCY)
                } else {
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
                    base to emptyList()
                }
                val applied = applyDangerSigns(scored.first, signs)
                VisitAdvice(
                    pregnancyId = pregnancy?.pregnancy_id,
                    score = applied,
                    action = recommendedAction(applied, signs),
                    modelVersion = if (scored.second.isNotEmpty()) EDGE_MODEL_VERSION else MODEL_VERSION,
                    chichewaFactors = scored.second
                )
            }
            "child" -> {
                val hasFever = signs.any { it.contains("Fever", ignoreCase = true) }
                val hasCough = signs.any { it.contains("breathing", ignoreCase = true) }
                val scored = if (edgeAi?.isModelLoaded(ModelKind.CHILD) == true) {
                    val features = floatArrayOf(
                        child?.dob?.let { dob ->
                            ((System.currentTimeMillis() - parseDate(dob)) / DAY_MS / 30.4375).toFloat()
                        } ?: -1f,
                        child?.muac?.toFloat() ?: -1f,
                        child?.weight_kg?.toFloat() ?: -1f,
                        child?.height_cm?.toFloat() ?: -1f,
                        if (hasFever) 1f else 0f,
                        if (hasCough) 1f else 0f,
                        if (signs.any { it.contains("Diarrhea", ignoreCase = true) }) 1f else 0f
                    )
                    val result = edgeAi.scoreChild(features)
                    RiskScoreResult(
                        riskScore = result.score,
                        riskCategory = result.category,
                        topFactors = result.topFactors.map { it.label }
                    ) to ChichewaExplainer.topRiskFactors(result, ModelKind.CHILD)
                } else {
                    RiskScorer.scoreChild(
                        ageMonths = null,
                        muac = child?.muac,
                        weightKg = child?.weight_kg,
                        heightCm = child?.height_cm,
                        hasFever = hasFever,
                        hasCough = hasCough,
                        hasDiarrhea = false,
                        dangerSigns = signs
                    ) to emptyList()
                }
                VisitAdvice(
                    childId = child?.child_id,
                    score = scored.first,
                    action = recommendedAction(scored.first, signs),
                    modelVersion = if (scored.second.isNotEmpty()) EDGE_MODEL_VERSION else MODEL_VERSION,
                    chichewaFactors = scored.second
                )
            }
            else -> VisitAdvice(
                score = RiskScoreResult(0f, RiskLevel.LOW, emptyList()),
                action = "continue_routine"
            )
        }
    }

    private const val DAY_MS = 86_400_000L

    private fun parseDate(dob: String): Long = try {
        java.time.Instant.parse(dob).toEpochMilli()
    } catch (_: Exception) {
        try {
            java.time.LocalDate.parse(dob.take(10))
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli()
        } catch (_: Exception) {
            System.currentTimeMillis()
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
