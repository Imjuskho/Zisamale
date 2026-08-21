package com.zisamale.ml

import com.zisamale.domain.model.RiskLevel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EdgeAITest {

    private val edgeAi = EdgeAI(context = null)

    private fun pregnancyFeatures(
        age: Float = 25f,
        parity: Float = 2f,
        stillbirths: Float = 0f,
        csections: Float = 0f,
        systolic: Float = 115f,
        diastolic: Float = 75f,
        hemoglobin: Float = 11f,
        foodSecurity: Float = 4f,
        distanceKm: Float = 3f,
        hivPositive: Float = 0f
    ): FloatArray = floatArrayOf(
        age, parity, stillbirths, csections, systolic,
        diastolic, hemoglobin, foodSecurity, distanceKm, hivPositive
    )

    private fun childFeatures(
        ageMonths: Float = 12f,
        muac: Float = 13.5f,
        weightKg: Float = 9f,
        heightCm: Float = 74f,
        fever: Float = 0f,
        cough: Float = 0f,
        diarrhea: Float = 0f
    ): FloatArray = floatArrayOf(ageMonths, muac, weightKg, heightCm, fever, cough, diarrhea)

    // ---- Rule-based fallback -------------------------------------------------

    @Test
    fun `falls back to rule based scoring when tflite model unavailable`() {
        assertFalse(edgeAi.isModelLoaded(ModelKind.PREGNANCY))
        val result = edgeAi.scorePregnancy(pregnancyFeatures())
        assertEquals(ScoringSource.RULE_BASED, result.source)
        assertTrue(result.score in 0f..10f)
    }

    @Test
    fun `low risk pregnancy scores low with rule fallback`() {
        val result = edgeAi.scorePregnancy(pregnancyFeatures())
        assertEquals(RiskLevel.LOW, result.category)
        assertTrue(result.topFactors.isEmpty())
    }

    @Test
    fun `high risk pregnancy detected by rule fallback`() {
        val risky = pregnancyFeatures(
            age = 17f,
            parity = 0f,
            stillbirths = 1f,
            systolic = 150f,
            diastolic = 95f,
            hemoglobin = 7.0f,
            foodSecurity = 1f,
            distanceKm = 15f
        )
        val result = edgeAi.scorePregnancy(risky)
        assertEquals(ScoringSource.RULE_BASED, result.source)
        assertTrue("expected HIGH/CRITICAL but was ${result.category}", result.score >= 7f)
        assertTrue(result.category == RiskLevel.HIGH || result.category == RiskLevel.CRITICAL)
        assertEquals(3, result.topFactors.size)
        assertTrue(result.topFactors.all { it.weight > 0f })
        assertTrue(result.topFactors[0].weight >= result.topFactors.last().weight)
    }

    @Test
    fun `child scoring flags severe malnutrition via rule fallback`() {
        val result = edgeAi.scoreChild(
            childFeatures(ageMonths = 4f, muac = 11.0f, weightKg = 2.2f, fever = 1f)
        )
        assertEquals(ScoringSource.RULE_BASED, result.source)
        assertTrue(result.score >= 5f)
        assertTrue(result.topFactors.any { it.featureIndex == EdgeAI.IDX_MUAC })
    }

    @Test
    fun `short feature arrays are padded instead of crashing`() {
        val result = edgeAi.scorePregnancy(floatArrayOf(40f))
        assertEquals(ScoringSource.RULE_BASED, result.source)
        assertTrue(result.score in 0f..10f)
    }

    @Test
    fun `model update detection compares against bundled version`() {
        assertFalse(edgeAi.checkModelUpdate(EdgeAI.MODEL_VERSION))
        assertFalse(edgeAi.checkModelUpdate(EdgeAI.MODEL_VERSION - 1))
        assertTrue(edgeAi.checkModelUpdate(EdgeAI.MODEL_VERSION + 1))
    }

    // ---- Chichewa explainer --------------------------------------------------

    @Test
    fun `chichewa explainer returns non-empty strings for every level and kind`() {
        for (kind in ModelKind.entries) {
            for (level in RiskLevel.entries) {
                val explanation = ChichewaExplainer.explain(
                    RiskResult(5f, level, emptyList(), ScoringSource.RULE_BASED, 1),
                    kind
                )
                assertTrue(explanation.summary.isNotBlank())
                assertTrue(explanation.factors.isNotEmpty())
                assertTrue(explanation.actions.isNotEmpty())
                explanation.factors.forEach { assertTrue(it.isNotBlank()) }
                explanation.actions.forEach { assertTrue(it.isNotBlank()) }
            }
        }
    }

    @Test
    fun `chichewa explainer maps top three factors`() {
        val risky = pregnancyFeatures(
            age = 16f,
            stillbirths = 2f,
            systolic = 160f,
            diastolic = 100f,
            hemoglobin = 6.5f,
            distanceKm = 20f
        )
        val result = edgeAi.scorePregnancy(risky)
        val factors = ChichewaExplainer.topRiskFactors(result, ModelKind.PREGNANCY)

        assertEquals(3, factors.size)
        factors.forEach { assertTrue(it.isNotBlank()) }
        assertTrue(factors.none { it.startsWith("Chizindikiro chosadziwika") })
    }

    @Test
    fun `chichewa factor labels are known for all documented indices`() {
        for (index in 0 until EdgeAI.PREGNANCY_FEATURE_COUNT) {
            assertTrue(ChichewaExplainer.factorLabel(ModelKind.PREGNANCY, index).isNotBlank())
        }
        for (index in 0 until EdgeAI.CHILD_FEATURE_COUNT) {
            assertTrue(ChichewaExplainer.factorLabel(ModelKind.CHILD, index).isNotBlank())
        }
    }

    @Test
    fun `unknown feature index yields non-empty placeholder`() {
        val label = ChichewaExplainer.factorLabel(ModelKind.CHILD, 99)
        assertTrue(label.isNotBlank())
    }
}
