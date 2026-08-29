package com.zisamale.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zisamale.data.remote.SamalaAsset
import com.zisamale.data.remote.SamalaGuide
import com.zisamale.ui.component.Masthead
import com.zisamale.ui.theme.*

/** Topic→color mapping matching the dashboard's centralized theme. */
private val TOPIC_COLORS = mapOf(
    "malaria" to Color(0xFFD97706),
    "hiv" to Color(0xFFDC2626),
    "tb" to Color(0xFF0D9488),
    "maternal_health" to Color(0xFFE11D48),
    "child_health" to Color(0xFFEA580C),
    "nutrition" to Color(0xFF16A34A),
    "diarrhea" to Color(0xFF2563EB),
    "pneumonia" to Color(0xFF0284C7),
    "mental_health" to Color(0xFF7C3AED),
    "ncd" to Color(0xFF9F1239),
    "family_planning" to Color(0xFF0891B2),
    "acute_poisoning" to Color(0xFFB45309),
    "digital_health" to Color(0xFF0891B2),
)

private fun topicColor(topic: String) = TOPIC_COLORS[topic] ?: Stone500
private fun topicLabel(topic: String) = topic.replace("_", " ").split(" ").joinToString(" ") {
    it.replaceFirstChar { c -> c.uppercase() }
}

/**
 * Contextual knowledge assets for a household — shows matched assets and guides
 * based on the household's risk profile. CHWs see this when opening a household
 * to share relevant health information during a visit.
 */
@Composable
fun KnowledgeAssetsScreen(
    householdId: String,
    assets: List<SamalaAsset>,
    guides: List<SamalaGuide>,
    topicHints: List<String>,
    onAssetClick: (SamalaAsset) -> Unit,
    onGuideClick: (SamalaGuide) -> Unit,
    onBack: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Knowledge for this Household",
            subtitle = "Matched by risk profile",
            showRule = true,
            onBack = onBack,
        )

        LazyColumn(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 12.dp),
        ) {
            // Topic hints
            if (topicHints.isNotEmpty()) {
                item {
                    Surface(
                        color = Pine.copy(alpha = 0.05f),
                        border = BorderStroke(1.dp, Pine.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(4.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text("Relevant topics:", fontSize = 12.sp, color = Stone500)
                            topicHints.forEach { topic ->
                                val color = topicColor(topic)
                                Surface(
                                    color = color.copy(alpha = 0.1f),
                                    shape = RoundedCornerShape(10.dp),
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .background(color, CircleShape)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            topicLabel(topic),
                                            fontSize = 11.sp,
                                            color = color,
                                            fontWeight = FontWeight.Medium,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Matched assets
            if (assets.isNotEmpty()) {
                item {
                    Text(
                        "Knowledge Assets (${assets.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Pine,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                items(assets) { asset ->
                    AssetCard(asset = asset, onClick = { onAssetClick(asset) })
                }
            }

            // Matched guides
            if (guides.isNotEmpty()) {
                item {
                    Text(
                        "Self-Care Guides (${guides.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Pine,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                items(guides) { guide ->
                    GuideCard(guide = guide, onClick = { onGuideClick(guide) })
                }
            }

            if (assets.isEmpty() && guides.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "No matched content for this household yet.",
                            color = Stone400,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AssetCard(asset: SamalaAsset, onClick: () -> Unit) {
    val severityColor = when (asset.severity) {
        "emergency" -> Color(0xFFDC2626)
        "warning" -> Color(0xFFF59E0B)
        else -> Color(0xFF2563EB)
    }

    Surface(
        color = Color.White,
        border = BorderStroke(1.dp, WarmStone),
        shape = RoundedCornerShape(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    asset.title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = Pine,
                    modifier = Modifier.weight(1f),
                )
                Surface(
                    color = severityColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp),
                ) {
                    Text(
                        asset.severity,
                        fontSize = 10.sp,
                        color = severityColor,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            Text(
                asset.key_finding,
                fontSize = 12.sp,
                color = Stone600,
                maxLines = 2,
            )

            if (asset.title_chichewa != null) {
                Text(
                    asset.title_chichewa,
                    fontSize = 11.sp,
                    color = Ochre,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }

            Spacer(Modifier.height(4.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                // Topic color dot
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(topicColor(asset.health_topic), CircleShape)
                )
                Surface(
                    color = Stone100,
                    shape = RoundedCornerShape(4.dp),
                ) {
                    Text(
                        asset.asset_type.replace("_", " "),
                        fontSize = 10.sp,
                        color = Stone500,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                Text(
                    topicLabel(asset.health_topic),
                    fontSize = 10.sp,
                    color = topicColor(asset.health_topic),
                )
            }
        }
    }
}

@Composable
private fun GuideCard(guide: SamalaGuide, onClick: () -> Unit) {
    val severityColor = when (guide.severity) {
        "emergency" -> Color(0xFFDC2626)
        "warning" -> Color(0xFFF59E0B)
        else -> Color(0xFF2563EB)
    }

    Surface(
        color = Color.White,
        border = BorderStroke(1.dp, WarmStone),
        shape = RoundedCornerShape(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    guide.title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = Pine,
                    modifier = Modifier.weight(1f),
                )
                Surface(
                    color = severityColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp),
                ) {
                    Text(
                        guide.severity,
                        fontSize = 10.sp,
                        color = severityColor,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
            }

            if (guide.title_chichewa != null) {
                Text(
                    guide.title_chichewa,
                    fontSize = 12.sp,
                    color = Ochre,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }

            Spacer(Modifier.height(4.dp))

            guide.what_it_is?.let {
                Text(it, fontSize = 12.sp, color = Stone600, maxLines = 2)
            }
        }
    }
}
