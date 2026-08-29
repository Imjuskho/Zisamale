package com.zisamale.ui.component

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.zisamale.ui.theme.*

/**
 * Patient/Household Card — risk-scored card with expandable details.
 * 1:1 parity with web PatientCard.tsx
 */
@Composable
fun PatientCard(
    householdName: String,
    riskScore: Int,
    members: Int,
    underFive: Int,
    lastVisit: String?,
    modifier: Modifier = Modifier,
    expandedContent: (@Composable () -> Unit)? = null,
) {
    var expanded by remember { mutableStateOf(false) }

    val borderColor = when {
        riskScore <= 3 -> RiskLow
        riskScore <= 6 -> RiskMedium
        riskScore <= 8 -> RiskHigh
        else -> RiskCritical
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .animateContentSize(),
        shape = RoundedCornerShape(2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier
                .clickable { if (expandedContent != null) expanded = !expanded }
                .padding(16.dp)
                .fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = householdName,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = ZisamaleDark,
                    )
                    Text(
                        text = "$members members · $underFive under-5",
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralGray,
                    )
                }
                RiskBadge(score = riskScore)
            }

            if (lastVisit != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Last visit: $lastVisit",
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralGray,
                )
            }

            if (expanded && expandedContent != null) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = SurfaceBorder)
                Spacer(modifier = Modifier.height(12.dp))
                expandedContent()
            }
        }
    }
}
