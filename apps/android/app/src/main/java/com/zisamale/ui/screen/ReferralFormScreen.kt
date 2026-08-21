package com.zisamale.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class FacilityOption(
    val facilityId: String,
    val name: String,
    val distanceKm: Float,
    val stockAvailable: Boolean,
    val score: Float
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferralFormScreen(
    visitId: String,
    facilities: List<FacilityOption> = emptyList(),
    onSubmit: (String, String) -> Unit
) {
    var selectedFacility by remember { mutableStateOf<FacilityOption?>(null) }
    var urgency by remember { mutableStateOf("routine") }
    var reason by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Referral Form") })
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp)
        ) {
            Text("Visit: $visitId", style = MaterialTheme.typography.bodySmall)

            Spacer(modifier = Modifier.height(16.dp))

            Text("Urgency", style = MaterialTheme.typography.titleMedium)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("routine", "urgent", "emergency").forEach { level ->
                    FilterChip(
                        selected = urgency == level,
                        onClick = { urgency = level },
                        label = { Text(level.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Referral Reason") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text("Recommended Facilities", style = MaterialTheme.typography.titleMedium)

            facilities.forEach { facility ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedFacility?.facilityId == facility.facilityId)
                            MaterialTheme.colorScheme.primaryContainer
                        else MaterialTheme.colorScheme.surface
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(facility.name, style = MaterialTheme.typography.bodyMedium)
                            Text("${facility.distanceKm}km", style = MaterialTheme.typography.bodySmall)
                            if (facility.stockAvailable) {
                                Text("Stock available", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                            } else {
                                Text("Stock low", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Text(String.format("%.1f", facility.score), style = MaterialTheme.typography.titleMedium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    selectedFacility?.let { onSubmit(it.facilityId, urgency) }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = selectedFacility != null && reason.isNotBlank()
            ) {
                Text("Submit Referral")
            }
        }
    }
}
