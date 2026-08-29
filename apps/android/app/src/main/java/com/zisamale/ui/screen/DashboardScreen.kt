package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*
import java.time.LocalTime

data class PriorityVisitItem(
    val householdId: String,
    val householdName: String,
    val visitType: String,
    val riskScore: Float,
    val riskCategory: String,
    val overdueDays: Int,
    val topRiskFactors: List<String>,
    val distanceKm: Float,
    val villageName: String? = null,
)

@Composable
fun DashboardScreen(
    chwName: String = "CHW",
    visits: List<PriorityVisitItem> = emptyList(),
    pendingCount: Int = 0,
    onVisitClick: (String, String) -> Unit = { _, _ -> },
    onHouseholdsClick: () -> Unit = {},
    onReferralsClick: () -> Unit = {},
) {
    val greeting = timeGreeting()

    Column(modifier = Modifier.fillMaxSize()) {
        // Masthead — serif "Today" with time-aware greeting
        Masthead(
            title = "Today",
            subtitle = "$greeting, $chwName",
            showRule = true,
        )

        // High-risk banner
        val highRiskCount = visits.count { it.riskCategory in listOf("high", "critical") }
        if (highRiskCount > 0) {
            Surface(
                color = RiskCriticalLight,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(2.dp),
                border = BorderStroke(1.dp, RiskCritical),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RiskBadge(
                        score = visits.maxOfOrNull { it.riskScore.toInt() } ?: 10,
                        size = BadgeSize.MEDIUM,
                        showLabel = false,
                    )
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            "$highRiskCount high-risk ${if (highRiskCount == 1) "visit" else "visits"} require attention",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold
                            ),
                            color = RiskCritical,
                        )
                        Text(
                            "Mndandanda wa odwala omwe ali pachiwopsecho",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedInk,
                        )
                    }
                }
            }
        }

        // Visit list
        if (visits.isEmpty()) {
            // Empty state
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    "All clear for today",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Paloma odwala lero",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MutedInk,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Register households and schedule visits to see them here.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedInk,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 12.dp),
            ) {
                items(visits, key = { it.householdId }) { visit ->
                    VisitCard(
                        visit = visit,
                        onClick = { onVisitClick(visit.householdId, visit.visitType) }
                    )
                }
            }
        }

        // Sync strip — honest pending count at bottom
        SyncStrip(pendingCount = pendingCount)
    }
}

/**
 * Priority visit card — urgency-spine left border, risk stamp top-right,
 * village + distance + overdue. 48dp min touch target for field use.
 */
@Composable
private fun VisitCard(visit: PriorityVisitItem, onClick: () -> Unit) {
    val spineColor = when (visit.riskCategory) {
        "critical" -> RiskCritical
        "high" -> RiskHigh
        "medium" -> RiskMedium
        else -> RiskLow
    }

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(2.dp),
        color = CardParchment,
        border = BorderStroke(1.dp, WarmStone),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(modifier = Modifier.heightIn(min = 64.dp)) {
            // Left urgency spine
            Surface(
                color = spineColor,
                modifier = Modifier.width(4.dp),
            ) {}

            // Content
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            visit.villageName ?: visit.householdName,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        val meta = buildList {
                            add(visit.visitType.replaceFirstChar { it.uppercase() })
                            if (visit.overdueDays > 0) add("${visit.overdueDays}d overdue")
                        }
                        Text(
                            meta.joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = if (visit.overdueDays > 0) Terracotta else MutedInk,
                        )
                    }
                    RiskBadge(
                        score = visit.riskScore.toInt().coerceIn(1, 10),
                        size = BadgeSize.SMALL,
                        showLabel = false,
                    )
                }

                if (visit.topRiskFactors.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        visit.topRiskFactors.first(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedInk,
                    )
                }

                if (visit.distanceKm > 0) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "%.1f km away".format(visit.distanceKm),
                        style = MaterialTheme.typography.labelMedium,
                        color = MutedInk,
                    )
                }
            }
        }
    }
}

/**
 * Bottom strip — honest sync pending count.
 * Lives outside the scroll area so it's always visible.
 */
@Composable
private fun SyncStrip(pendingCount: Int) {
    Surface(
        color = CardParchment,
        border = BorderStroke(1.dp, WarmStone),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (pendingCount > 0) "$pendingCount pending sync / Osayembeza"
                else "All synced / Yalumikizidwa onse",
                style = MaterialTheme.typography.labelMedium,
                color = if (pendingCount > 0) RiskMedium else RiskLow,
            )
        }
    }
}

/** Time-of-day greeting — bilingual. */
private fun timeGreeting(): String {
    val hour = try { LocalTime.now().hour } catch (_: Throwable) { 12 }
    return when {
        hour < 12 -> "Good morning"
        hour < 17 -> "Good afternoon"
        else -> "Good evening"
    }
}
