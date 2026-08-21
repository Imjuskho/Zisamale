package com.zisamale.ml

import com.zisamale.domain.model.RiskLevel

data class ChichewaExplanation(
    val summary: String,
    val factors: List<String>,
    val actions: List<String>
)

/**
 * Translates risk results into Chichewa for CHWs. Every accessor guarantees a
 * non-empty string so UI never renders a blank explanation.
 */
object ChichewaExplainer {

    private val pregnancyFactorText = mapOf(
        EdgeAI.IDX_AGE_YEARS to "Ali ndi zaka zosakwana 18 kapena zoposa 35",
        EdgeAI.IDX_PARITY to "Ndi mimba yake yoyamba",
        EdgeAI.IDX_PRIOR_STILLBIRTHS to "Anabereka mwana wakufa kale",
        EdgeAI.IDX_PRIOR_CSECTIONS to "Anathiridwa opareshoni ya chimfine kale",
        EdgeAI.IDX_BP_SYSTOLIC to "Mphamvu ya magazi ikwera kwambiri (BP)",
        EdgeAI.IDX_BP_DIASTOLIC to "Mphamvu ya magazi yotsika ikwera (BP)",
        EdgeAI.IDX_HEMOGLOBIN to "Magazi ochepa m'thupi (chizungulire)",
        EdgeAI.IDX_FOOD_SECURITY to "Banja silipezala zakudya zokwanira",
        EdgeAI.IDX_DISTANCE_KM to "Chipatala chili kutali kwambiri",
        EdgeAI.IDX_HIV_POSITIVE to "Ali ndi HIV"
    )

    private val childFactorText = mapOf(
        EdgeAI.IDX_CHILD_AGE_MONTHS to "Mwana ali pansi pa miyezi 6",
        EdgeAI.IDX_MUAC to "Mwana wamva njala kwambiri (MUAC yochepa)",
        EdgeAI.IDX_WEIGHT_KG to "Mwana alemera pang'ono kwambiri",
        EdgeAI.IDX_HEIGHT_CM to "Mwana wakula pang'ono pa utali",
        EdgeAI.IDX_FEVER to "Mwana ali ndi malungo",
        EdgeAI.IDX_COUGH to "Mwana akutsina khosi",
        EdgeAI.IDX_DIARRHEA to "Mwana ali ndi matenda a m'mimba (kutsegula)"
    )

    private val summaries = mapOf(
        RiskLevel.LOW to "Palibe chiopsezo chokwera. Pitirizani kusamalira bwino.",
        RiskLevel.MEDIUM to "Chiopsezo chapakati. Yang'anani mwamphamvu posachedwa.",
        RiskLevel.HIGH to "Chiopsezo chachikulu. Funani thandizo la chipatala msanga.",
        RiskLevel.CRITICAL to "CHIOPSEZO CHOOPSA KWAMBIRI! Samutsani kwa chipatala tsopano!"
    )

    private val pregnancyActions = mapOf(
        RiskLevel.LOW to listOf(
            "Pitani ku unamwino pa tsiku lomwe lanenera",
            "Idyani zakudya zokhala ndi mphamvu",
            "Gwiritsani ntchito neti wa chipatala"
        ),
        RiskLevel.MEDIUM to listOf(
            "Pitani ku unamwino posachedwa masiku 7",
            "Mpatseni mankhwala a chitsulo ndi folic acid",
            "Pezani magazi oyesa (hemoglobin test)"
        ),
        RiskLevel.HIGH to listOf(
            "Samutsani kwa chipatala za amayi msanga",
            "Yesani magazi ndi kanyera kamodzi sabata",
            "Konzekerani kubereka ku chipatala chikulu"
        ),
        RiskLevel.CRITICAL to listOf(
            "Samutsani kwa chipatala TSOPANO ndi galimoto ya ambulance",
            "Khalani ndi mwini wake pamene ali kupita",
            "Lembetsani referral ndikudziwitsa sisitala"
        )
    )

    private val childActions = mapOf(
        RiskLevel.LOW to listOf(
            "Dyetsani mwana bwino komanso mamezi a amayi",
            "Pitani ku clinic pa tsiku la kajambula"
        ),
        RiskLevel.MEDIUM to listOf(
            "Patsani mwana chakudya champhamvu (RUTF ngati muli nayo)",
            "Yesa MUAC sabata iliyonse",
            "Pitani ku clinic posachedwa masiku 7"
        ),
        RiskLevel.HIGH to listOf(
            "Samutsani kwa chipatala cha ana msanga",
            "Patsani mankhwala a matenda a m'mimba (ORS)",
            "Dyetsani mwana pang'ono pang'ono koma kanthawi konse"
        ),
        RiskLevel.CRITICAL to listOf(
            "Samutsani kwa chipatala TSOPANO",
            "Patsani ORS pomwe mukupita ngati ali ndi kutsegula",
            "Khalani ndi mwana kumaloza kwa chipatala"
        )
    )

    fun factorLabel(kind: ModelKind, featureIndex: Int): String {
        val table = if (kind == ModelKind.PREGNANCY) pregnancyFactorText else childFactorText
        return table[featureIndex] ?: "Chizindikiro chosadziwika #$featureIndex"
    }

    fun topRiskFactors(result: RiskResult, kind: ModelKind): List<String> {
        val factors = result.topFactors
            .sortedByDescending { it.weight }
            .take(3)
            .map { factorLabel(kind, it.featureIndex) }
        return if (factors.isEmpty()) {
            listOf("Palibe zizindikiro zoopsa zomwe zazindikiridwa")
        } else {
            factors
        }
    }

    fun recommendedActions(category: RiskLevel, kind: ModelKind): List<String> {
        val actions = if (kind == ModelKind.PREGNANCY) pregnancyActions else childActions
        return actions[category].orEmpty().ifEmpty { listOf("Pitani ku chipatala pa nthawi") }
    }

    fun summary(category: RiskLevel): String =
        summaries[category] ?: "Yang'anani mwachidule ndi chipatala."

    fun explain(result: RiskResult, kind: ModelKind): ChichewaExplanation =
        ChichewaExplanation(
            summary = summary(result.category),
            factors = topRiskFactors(result, kind),
            actions = recommendedActions(result.category, kind)
        )
}
