package com.zisamale.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class PriorityVisitItem(
    val householdId: String,
    val householdName: String,
    val visitType: String,
    val riskScore: Float,
    val riskCategory: String,
    val overdueDays: Int,
    val topRiskFactors: List<String>,
    val distanceKm: Float
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    chwName: String = "CHW",
    visits: List<PriorityVisitItem> = emptyList(),
    onVisitClick: (String, String) -> Unit = { _, _ -> }
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Zisamale - Daily Dashboard") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Good morning, $chwName", style = MaterialTheme.typography.titleMedium)
                    Text("${visits.size} visits scheduled today", style = MaterialTheme.typography.bodyMedium)
                    val highRisk = visits.count { it.riskCategory in listOf("high", "critical") }
                    if (highRisk > 0) {
                        Text(
                            "$highRisk high-risk patients require attention",
                            color = Color.Red,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            LazyColumn(modifier = Modifier.padding(horizontal = 16.dp)) {
                items(visits) { visit ->
                    VisitCard(visit = visit, onClick = { onVisitClick(visit.householdId, visit.visitType) })
                }
            }
        }
    }
}

@Composable
fun VisitCard(visit: PriorityVisitItem, onClick: () -> Unit) {
    val riskColor = when (visit.riskCategory) {
        "critical" -> Color(0xFFDC2626)
        "high" -> Color(0xFFEA580C)
        "medium" -> Color(0xFFD97706)
        else -> Color(0xFF16A34A)
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = riskColor,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        String.format("%.1f", visit.riskScore),
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(visit.householdName, fontWeight = FontWeight.Bold)
                Text(visit.visitType.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall)
                if (visit.topRiskFactors.isNotEmpty()) {
                    Text(
                        visit.topRiskFactors.first(),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("${visit.distanceKm}km", style = MaterialTheme.typography.bodySmall)
                if (visit.overdueDays > 0) {
                    Text("${visit.overdueDays}d overdue", color = Color.Red, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
