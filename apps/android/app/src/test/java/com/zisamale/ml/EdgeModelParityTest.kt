package com.zisamale.ml

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Proves the bundled .zgb ensembles reproduce the trained sklearn models
 * exactly on exported golden vectors, and logs the inference benchmark
 * required by the M3 exit gate (device re-benchmark lands with M5's
 * instrumented runs).
 */
class EdgeModelParityTest {

    private fun asset(name: String): File {
        var dir = File(System.getProperty("user.dir")!!)
        repeat(4) {
            val candidate = File(dir, "src/main/assets/models/$name")
            if (candidate.exists()) return candidate
            dir = dir.parentFile ?: return@repeat
        }
        error("asset not found: $name")
    }

    private fun goldenLines(kind: String): List<FloatArray> =
        asset("golden_${kind}_v${EdgeAI.MODEL_VERSION}.txt")
            .readText()
            .trim()
            .split('\n')
            .map { line -> line.trim().split(Regex("\\s+")).map { it.toFloat() }.toFloatArray() }

    @Test
    fun `pregnancy ensemble reproduces trained model on golden vectors`() {
        val model = TreeEnsembleModel.load(asset(ModelKind.PREGNANCY.assetName))!!
        assertTrue(model.version == EdgeAI.MODEL_VERSION)
        val vectors = goldenLines("pregnancy")
        assertTrue(vectors.size >= 50)
        vectors.forEach { v ->
            val expected = v.last()
            val actual = model.predict(v.copyOfRange(0, EdgeAI.PREGNANCY_FEATURE_COUNT))
            assertTrue("expected $expected got $actual", kotlin.math.abs(expected - actual) <= 1e-3f)
        }
    }

    @Test
    fun `child ensemble reproduces trained model on golden vectors`() {
        val model = TreeEnsembleModel.load(asset(ModelKind.CHILD.assetName))!!
        assertTrue(model.version == EdgeAI.MODEL_VERSION)
        val vectors = goldenLines("child")
        assertTrue(vectors.size >= 50)
        vectors.forEach { v ->
            val expected = v.last()
            val actual = model.predict(v.copyOfRange(0, EdgeAI.CHILD_FEATURE_COUNT))
            assertTrue("expected $expected got $actual", kotlin.math.abs(expected - actual) <= 1e-3f)
        }
    }

    @Test
    fun `bundled models stay under the 5MB edge budget`() {
        val total = listOf(
            ModelKind.PREGNANCY,
            ModelKind.CHILD
        ).sumOf { asset(it.assetName).length() }
        assertTrue("bundled models too large: $total bytes", total < 5 * 1024 * 1024)
    }

    @Test
    fun `inference benchmark - log per-prediction latency`() {
        val pregnancy = TreeEnsembleModel.load(asset(ModelKind.PREGNANCY.assetName))!!
        val child = TreeEnsembleModel.load(asset(ModelKind.CHILD.assetName))!!
        val vector = FloatArray(EdgeAI.PREGNANCY_FEATURE_COUNT) { 1f + it }
        val childVector = FloatArray(EdgeAI.CHILD_FEATURE_COUNT) { 1f }

        // Warm-up then measure.
        repeat(500) { pregnancy.predict(vector); child.predict(childVector) }
        val runs = 20_000
        val start = System.nanoTime()
        repeat(runs) { i ->
            if (i % 2 == 0) pregnancy.predict(vector) else child.predict(childVector)
        }
        val perPredictionUs = (System.nanoTime() - start) / runs / 1_000.0
        println("EDGE-BENCH: $perPredictionUs µs/prediction (host JVM)")
        // Generous ceiling for CI noise; real device budget (<100 ms) re-checked in M5.
        assertTrue(perPredictionUs < 5_000.0)
    }
}
