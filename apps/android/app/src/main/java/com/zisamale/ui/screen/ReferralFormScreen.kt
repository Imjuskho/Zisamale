package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*

data class FacilityOption(
    val facilityId: String,
    val name: String,
    val distanceKm: Float,
    val stockAvailable: Boolean,
    val score: Float,
)

/**
 * Referral form — urgency chips with semantic color, selectable facility cards.
 *
 * Intent:     After a dangerous visit, Grace must pick the right facility fast.
 * Hierarchy:  Urgency chips lead (color = severity), facility cards follow.
 */
@Composable
fun ReferralFormScreen(
    visitId: String,
    facilities: List<FacilityOption> = emptyList(),
    onSubmit: (facilityId: String, urgency: String, reason: String) -> Unit,
) {
    var selectedFacility by remember { mutableStateOf<FacilityOption?>(null) }
    var urgency by remember { mutableStateOf("routine") }
    var reason by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Referral",
            subtitle = "Kutumiza ku chipatala",
            showRule = true,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Urgency — semantic colored chips
            Text("Urgency / Kuthamanga", style = MaterialTheme.typography.titleMedium)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                UrgencyChip(
                    label = "Routine / Wantheratu",
                    selected = urgency == "routine",
                    onClick = { urgency = "routine" },
                    color = Sage,
                    modifier = Modifier.weight(1f),
                )
                UrgencyChip(
                    label = "Urgent / Kuthamanga",
                    selected = urgency == "urgent",
                    onClick = { urgency = "urgent" },
                    color = RiskMedium,
                    modifier = Modifier.weight(1f),
                )
                UrgencyChip(
                    label = "Emergency / Kachilendo",
                    selected = urgency == "emergency",
                    onClick = { urgency = "emergency" },
                    color = RiskCritical,
                    modifier = Modifier.weight(1f),
                )
            }

            // Reason
            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Referral reason / Chifukwa") },
                modifier = Modifier.fillMaxWidth(),
            )

            // Facilities
            Text("Recommended facilities", style = MaterialTheme.typography.titleMedium)
            facilities.forEach { facility ->
                val isSelected = selectedFacility?.facilityId == facility.facilityId
                val spineColor = when {
                    !facility.stockAvailable -> RiskCritical
                    facility.score >= 8f -> RiskLow
                    else -> Sage
                }
                Surface(
                    onClick = { selectedFacility = facility },
                    shape = RoundedCornerShape(2.dp),
                    color = if (isSelected) Pine.copy(alpha = 0.08f) else CardParchment,
                    border = BorderStroke(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) Pine else WarmStone,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(modifier = Modifier.heightIn(min = 56.dp)) {
                        Surface(
                            color = spineColor,
                            modifier = Modifier.width(4.dp),
                        ) {}
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                        ) {
                            Text(
                                facility.name,
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    "${facility.distanceKm}km · ${if (facility.stockAvailable) "Stock ✓" else "Stock low"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (facility.stockAvailable) RiskLow else Terracotta,
                                )
                                Text(
                                    "%.1f".format(facility.score),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = Pine,
                                )
                            }
                        }
                    }
                }
            }
        }

        // Submit
        Surface(
            color = CardParchment,
            border = BorderStroke(1.dp, WarmStone),
        ) {
            Button(
                onClick = {
                    selectedFacility?.let { onSubmit(it.facilityId, urgency, reason.trim()) }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
                    .height(52.dp),
                enabled = selectedFacility != null && reason.isNotBlank(),
            ) {
                Text(
                    "Submit referral / Tumiza",
                    style = MaterialTheme.typography.titleMedium,
                )
            }
        }
    }
}
