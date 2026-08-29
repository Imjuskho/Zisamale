package com.zisamale.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.zisamale.ui.theme.*

/**
 * Alert Card — disease-specific alert with risk badge, status, and actions.
 * 1:1 parity with web AlertCard.tsx
 */
@Composable
fun AlertCard(
    disease: String,
    taName: String,
    riskScore: Int,
    predictedCases: Int,
    confidenceUpper: Float?,
    generatedAt: String,
    responseStatus: String,
    modifier: Modifier = Modifier,
    onAcknowledge: (() -> Unit)? = null,
    onDeployDrRRt: (() -> Unit)? = null,
    onRequestSupplies: (() -> Unit)? = null,
) {
    val borderColor = when {
        riskScore <= 3 -> RiskLow
        riskScore <= 6 -> RiskMedium
        riskScore <= 8 -> RiskHigh
        else -> RiskCritical
    }

    val statusColor = when (responseStatus) {
        "resolved" -> RiskLow
        "in_progress" -> InfoBlue
        "acknowledged" -> ZisamaleTeal
        else -> RiskCritical
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            // Editorial: critical alerts get a 4dp terracotta/blood left
            // border - structural emphasis instead of shadow.
            .border(
                width = if (riskScore > 8) 4.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(2.dp),
            ),
        shape = RoundedCornerShape(2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = disease.uppercase(),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                        ),
                        color = ZisamaleDark,
                    )
                    Text(
                        text = "$taName · Predicted: $predictedCases cases",
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralGray,
                    )
                }
                RiskBadge(score = riskScore, size = BadgeSize.MEDIUM)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Stats row
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(
                    text = "Confidence: ${confidenceUpper?.let { "${(it * 100).toInt()}%" } ?: "N/A"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralGray,
                )
                Text(
                    text = generatedAt,
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralGray,
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Status badge
            Surface(
                shape = RoundedCornerShape(2.dp),
                color = statusColor.copy(alpha = 0.1f),
            ) {
                Text(
                    text = responseStatus.uppercase().replace("_", " "),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                    ),
                    color = statusColor,
                )
            }

            // Actions (only for pending)
            if (responseStatus == "pending") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    onAcknowledge?.let {
                        Button(
                            onClick = it,
                            colors = ButtonDefaults.buttonColors(containerColor = ZisamaleGreen),
                            modifier = Modifier.height(48.dp),
                        ) {
                            Text("ACKNOWLEDGE")
                        }
                    }
                    onDeployDrRRt?.let {
                        OutlinedButton(
                            onClick = it,
                            modifier = Modifier.height(48.dp),
                        ) {
                            Text("DEPLOY DRRT")
                        }
                    }
                    onRequestSupplies?.let {
                        TextButton(onClick = it) {
                            Text("SUPPLIES")
                        }
                    }
                }
            }
        }
    }
}
