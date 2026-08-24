package com.zisamale.ml

import java.io.File

/**
 * Runtime for Zisamale `.zgb` gradient-boosted tree ensembles produced by
 * services/ml/pipelines/train_edge_models.py. Pure Kotlin, no third-party
 * dependencies — small enough to stay instant on low-end devices and fully
 * unit-testable on the JVM.
 *
 * File format (plain text, exact float round-trip):
 *   zisamale-tree-ensemble <version> <kind> <featureCount>
 *   learning_rate <lr>
 *   init <f0>
 *   trees <n>
 *   tree <nodeCount>            (repeated n times)
 *   <feat| -1=leaf> <threshold> <left> <right> <value>
 */
class TreeEnsembleModel private constructor(
    val version: Int,
    val kind: String,
    val featureCount: Int,
    private val learningRate: Double,
    private val init: Double,
    private val treeFeatures: List<IntArray>,
    private val treeThresholds: List<DoubleArray>,
    private val treeLeft: List<IntArray>,
    private val treeRight: List<IntArray>,
    private val treeValues: List<DoubleArray>
) {

    fun predict(features: FloatArray): Float {
        require(featureCount <= features.size) {
            "expected >= $featureCount features, got ${features.size}"
        }
        var sum = init
        for (t in treeFeatures.indices) {
            val feat = treeFeatures[t]
            val thr = treeThresholds[t]
            val left = treeLeft[t]
            val right = treeRight[t]
            val value = treeValues[t]
            var node = 0
            while (feat[node] != -1) {
                node = if (features[feat[node]].toDouble() <= thr[node]) left[node] else right[node]
            }
            sum += learningRate * value[node]
        }
        return sum.toFloat()
    }

    companion object {
        const val MAGIC = "zisamale-tree-ensemble"

        fun load(file: File): TreeEnsembleModel? = try {
            parse(file.readText())
        } catch (_: Throwable) {
            null
        }

        fun parse(text: String): TreeEnsembleModel {
            val lines = text.split('\n')
            val header = lines[0].trim().split(' ')
            require(header[0] == MAGIC) { "not a $MAGIC file" }
            val version = header[1].toInt()
            val kind = header[2]
            val featureCount = header[3].toInt()

            fun value(line: String) = line.substringAfter(' ')
            val lr = value(lines[1].trim()).toDouble()
            val f0 = value(lines[2].trim()).toDouble()
            val nTrees = value(lines[3].trim()).toInt()

            val features = ArrayList<IntArray>(nTrees)
            val thresholds = ArrayList<DoubleArray>(nTrees)
            val lefts = ArrayList<IntArray>(nTrees)
            val rights = ArrayList<IntArray>(nTrees)
            val values = ArrayList<DoubleArray>(nTrees)

            var idx = 4
            repeat(nTrees) {
                val nodeCount = value(lines[idx].trim()).toInt()
                idx++
                val f = IntArray(nodeCount)
                val th = DoubleArray(nodeCount)
                val l = IntArray(nodeCount)
                val r = IntArray(nodeCount)
                val v = DoubleArray(nodeCount)
                repeat(nodeCount) { node ->
                    val parts = lines[idx].trim().split(' ')
                    idx++
                    f[node] = parts[0].toInt()
                    th[node] = parts[1].toDouble()
                    l[node] = parts[2].toInt()
                    r[node] = parts[3].toInt()
                    v[node] = parts[4].toDouble()
                }
                features.add(f); thresholds.add(th); lefts.add(l); rights.add(r); values.add(v)
            }
            return TreeEnsembleModel(
                version, kind, featureCount, lr, f0,
                features, thresholds, lefts, rights, values
            )
        }
    }
}
