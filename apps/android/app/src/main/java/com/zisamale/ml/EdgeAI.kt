package com.zisamale.ml

import android.content.Context
import com.zisamale.domain.model.RiskLevel
import java.io.File

enum class ScoringSource { TFLITE_MODEL, RULE_BASED }

enum class ModelKind { PREGNANCY, CHILD }

data class FactorContribution(
    val featureIndex: Int,
    val label: String,
    val weight: Float
)

data class RiskResult(
    val score: Float,
    val category: RiskLevel,
    val topFactors: List<FactorContribution>,
    val source: ScoringSource,
    val modelVersion: Int
)

/**
 * On-device risk scoring. Prefers a bundled TFLite model (loaded reflectively so the
 * app does not hard-depend on the TF Lite artifact); falls back to deterministic
 * rule-based scoring that mirrors RiskScorer whenever the model is unavailable,
 * corrupt, or fails at inference time.
 *
 * Pregnancy feature vector (10 floats):
 *   0 ageYears, 1 parity, 2 priorStillbirths, 3 priorCsections,
 *   4 bpSystolic, 5 bpDiastolic, 6 hemoglobin, 7 foodSecurityScore,
 *   8 distanceKm, 9 hivPositive(0/1)
 * Child feature vector (7 floats):
 *   0 ageMonths, 1 muac, 2 weightKg, 3 heightCm,
 *   4 fever(0/1), 5 cough(0/1), 6 diarrhea(0/1)
 */
class EdgeAI(private val context: Context? = null) {

    companion object {
        const val MODEL_VERSION = 3
        const val PREGNANCY_MODEL_ASSET = "models/risk_pregnancy_v$MODEL_VERSION.tflite"
        const val CHILD_MODEL_ASSET = "models/risk_child_v$MODEL_VERSION.tflite"

        const val PREGNANCY_FEATURE_COUNT = 10
        const val CHILD_FEATURE_COUNT = 7

        // Pregnancy indices
        const val IDX_AGE_YEARS = 0
        const val IDX_PARITY = 1
        const val IDX_PRIOR_STILLBIRTHS = 2
        const val IDX_PRIOR_CSECTIONS = 3
        const val IDX_BP_SYSTOLIC = 4
        const val IDX_BP_DIASTOLIC = 5
        const val IDX_HEMOGLOBIN = 6
        const val IDX_FOOD_SECURITY = 7
        const val IDX_DISTANCE_KM = 8
        const val IDX_HIV_POSITIVE = 9

        // Child indices
        const val IDX_CHILD_AGE_MONTHS = 0
        const val IDX_MUAC = 1
        const val IDX_WEIGHT_KG = 2
        const val IDX_HEIGHT_CM = 3
        const val IDX_FEVER = 4
        const val IDX_COUGH = 5
        const val IDX_DIARRHEA = 6

        private const val MAX_SCORE = 10f

        private val PREGNANCY_LABELS = mapOf(
            IDX_AGE_YEARS to "age_under_18_or_over_35",
            IDX_PARITY to "first_pregnancy",
            IDX_PRIOR_STILLBIRTHS to "prior_stillbirth",
            IDX_PRIOR_CSECTIONS to "prior_csection",
            IDX_BP_SYSTOLIC to "bp_high_systolic",
            IDX_BP_DIASTOLIC to "bp_high_diastolic",
            IDX_HEMOGLOBIN to "hemoglobin_low",
            IDX_FOOD_SECURITY to "food_insecure",
            IDX_DISTANCE_KM to "far_from_facility",
            IDX_HIV_POSITIVE to "hiv_positive"
        )

        private val CHILD_LABELS = mapOf(
            IDX_CHILD_AGE_MONTHS to "infant_under_6_months",
            IDX_MUAC to "acute_malnutrition",
            IDX_WEIGHT_KG to "underweight",
            IDX_HEIGHT_CM to "stunting",
            IDX_FEVER to "fever",
            IDX_COUGH to "cough",
            IDX_DIARRHEA to "diarrhea"
        )
    }

    private var pregnancyInterpreter: Any? = null
    private var childInterpreter: Any? = null

    init {
        pregnancyInterpreter = loadInterpreter(PREGNANCY_MODEL_ASSET, "risk_pregnancy.tflite")
        childInterpreter = loadInterpreter(CHILD_MODEL_ASSET, "risk_child.tflite")
    }

    fun isModelLoaded(kind: ModelKind): Boolean = when (kind) {
        ModelKind.PREGNANCY -> pregnancyInterpreter != null
        ModelKind.CHILD -> childInterpreter != null
    }

    /** True when the server advertises a newer model than the one bundled on device. */
    fun checkModelUpdate(latestServerVersion: Int): Boolean = latestServerVersion > MODEL_VERSION

    fun scorePregnancy(features: FloatArray): RiskResult {
        val normalized = features.copyOf(PREGNANCY_FEATURE_COUNT)
        val contributions = pregnancyContributions(normalized)
        val modelScore = pregnancyInterpreter?.let { runInference(it, normalized) }
        return if (modelScore != null && modelScore.isFinite()) {
            buildResult(
                modelScore.coerceIn(0f, MAX_SCORE),
                PREGNANCY_LABELS,
                ScoringSource.TFLITE_MODEL,
                contributions
            )
        } else {
            buildResult(
                contributions.sumOf { it.weight.toDouble() }.toFloat().coerceIn(0f, MAX_SCORE),
                PREGNANCY_LABELS,
                ScoringSource.RULE_BASED,
                contributions
            )
        }
    }

    fun scoreChild(features: FloatArray): RiskResult {
        val normalized = features.copyOf(CHILD_FEATURE_COUNT)
        val contributions = childContributions(normalized)
        val modelScore = childInterpreter?.let { runInference(it, normalized) }
        return if (modelScore != null && modelScore.isFinite()) {
            buildResult(
                modelScore.coerceIn(0f, MAX_SCORE),
                CHILD_LABELS,
                ScoringSource.TFLITE_MODEL,
                contributions
            )
        } else {
            buildResult(
                contributions.sumOf { it.weight.toDouble() }.toFloat().coerceIn(0f, MAX_SCORE),
                CHILD_LABELS,
                ScoringSource.RULE_BASED,
                contributions
            )
        }
    }

    // ---- Rule-based fallback -------------------------------------------------

    private fun pregnancyContributions(f: FloatArray): List<FactorContribution> {
        val contributions = mutableListOf<FactorContribution>()
        val age = f.getOrNull(IDX_AGE_YEARS)?.takeIf { it > 0f }
        if (age != null && age < 18f) add(contributions, IDX_AGE_YEARS, 1.5f)
        if (age != null && age > 35f) add(contributions, IDX_AGE_YEARS, 1.0f)
        if (f.getOrNull(IDX_PARITY) == 0f) add(contributions, IDX_PARITY, 1.2f)
        if ((f.getOrNull(IDX_PRIOR_STILLBIRTHS) ?: 0f) > 0f) add(contributions, IDX_PRIOR_STILLBIRTHS, 2.0f)
        if ((f.getOrNull(IDX_PRIOR_CSECTIONS) ?: 0f) > 0f) add(contributions, IDX_PRIOR_CSECTIONS, 1.0f)
        if ((f.getOrNull(IDX_BP_SYSTOLIC) ?: 0f) > 140f) add(contributions, IDX_BP_SYSTOLIC, 2.5f)
        if ((f.getOrNull(IDX_BP_DIASTOLIC) ?: 0f) > 90f) add(contributions, IDX_BP_DIASTOLIC, 2.0f)
        val hb = f.getOrNull(IDX_HEMOGLOBIN)?.takeIf { it > 0f }
        if (hb != null && hb < 8.0f) add(contributions, IDX_HEMOGLOBIN, 2.0f)
        val food = f.getOrNull(IDX_FOOD_SECURITY)?.takeIf { it >= 0f }
        if (food != null && food <= 2f) add(contributions, IDX_FOOD_SECURITY, 1.0f)
        val distance = f.getOrNull(IDX_DISTANCE_KM)?.takeIf { it > 0f }
        if (distance != null && distance > 10f) add(contributions, IDX_DISTANCE_KM, 1.5f)
        if ((f.getOrNull(IDX_HIV_POSITIVE) ?: 0f) > 0f) add(contributions, IDX_HIV_POSITIVE, 1.5f)
        return contributions
    }

    private fun childContributions(f: FloatArray): List<FactorContribution> {
        val contributions = mutableListOf<FactorContribution>()
        val muac = f.getOrNull(IDX_MUAC)?.takeIf { it > 0f }
        when {
            muac != null && muac < 11.5f -> add(contributions, IDX_MUAC, 3.0f)
            muac != null && muac < 12.5f -> add(contributions, IDX_MUAC, 1.5f)
        }
        if ((f.getOrNull(IDX_FEVER) ?: 0f) > 0f) add(contributions, IDX_FEVER, 1.0f)
        if ((f.getOrNull(IDX_COUGH) ?: 0f) > 0f && (f.getOrNull(IDX_DIARRHEA) ?: 0f) > 0f) {
            add(contributions, IDX_COUGH, 1.5f)
            add(contributions, IDX_DIARRHEA, 1.5f)
        }
        val ageMonths = f.getOrNull(IDX_CHILD_AGE_MONTHS)?.takeIf { it >= 0f }
        if (ageMonths != null && ageMonths < 6f) add(contributions, IDX_CHILD_AGE_MONTHS, 0.5f)
        val weight = f.getOrNull(IDX_WEIGHT_KG)?.takeIf { it > 0f }
        if (weight != null && weight < 2.5f) add(contributions, IDX_WEIGHT_KG, 2.0f)
        return contributions
    }

    private fun add(
        into: MutableList<FactorContribution>,
        index: Int,
        weight: Float
    ) {
        into.add(FactorContribution(index, "", weight))
    }

    private fun buildResult(
        score: Float,
        labels: Map<Int, String>,
        source: ScoringSource,
        contributions: List<FactorContribution>? = null
    ): RiskResult {
        val topFactors = (contributions ?: emptyList())
            .sortedByDescending { it.weight }
            .take(3)
            .map { it.copy(label = labels[it.featureIndex] ?: "feature_${it.featureIndex}") }
        return RiskResult(
            score = score,
            category = categorize(score),
            topFactors = topFactors,
            source = source,
            modelVersion = MODEL_VERSION
        )
    }

    private fun categorize(score: Float): RiskLevel = when {
        score <= 3.0f -> RiskLevel.LOW
        score <= 6.0f -> RiskLevel.MEDIUM
        score <= 8.0f -> RiskLevel.HIGH
        else -> RiskLevel.CRITICAL
    }

    // ---- TFLite via reflection ----------------------------------------------

    private fun loadInterpreter(assetPath: String, cacheName: String): Any? = try {
        val ctx = context ?: return null
        val modelFile = File(ctx.cacheDir, cacheName)
        ctx.assets.open(assetPath).use { input ->
            modelFile.outputStream().use { output -> input.copyTo(output) }
        }
        val interpreterClass = Class.forName("org.tensorflow.lite.Interpreter")
        val optionsClass = Class.forName("org.tensorflow.lite.Interpreter\$Options")
        val options = optionsClass.getDeclaredConstructor().newInstance()
        optionsClass.getMethod("setNumThreads", Int::class.javaPrimitiveType)
            .invoke(options, 2)
        interpreterClass.getDeclaredConstructor(File::class.java, optionsClass)
            .newInstance(modelFile, options)
    } catch (_: Throwable) {
        null
    }

    private fun runInference(interpreter: Any, features: FloatArray): Float? = try {
        val input = Array(1) { features.copyOf(features.size) }
        val output = Array(1) { FloatArray(1) }
        interpreter.javaClass
            .getMethod("run", Any::class.java, Any::class.java)
            .invoke(interpreter, input, output)
        output[0][0]
    } catch (_: Throwable) {
        null
    }
}
