package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.data.local.ChildEntity
import com.zisamale.data.local.HouseholdEntity
import com.zisamale.data.local.PregnancyEntity
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*

/**
 * Household profile — info card, active pregnancy/children, start visit actions.
 *
 * Intent:     Grace opens a household to review status and start a visit.
 * Hierarchy:  Village name in masthead, pregnancy card is focal if present.
 */
@Composable
fun HouseholdProfileScreen(
    household: HouseholdEntity,
    pregnancy: PregnancyEntity?,
    children: List<ChildEntity>,
    onStartVisit: (String) -> Unit,
    onViewKnowledge: () -> Unit = {},
    onRegisterPregnancy: () -> Unit,
    onRegisterChild: () -> Unit,
    onBack: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = household.village_name ?: "Household",
            subtitle = buildString {
                household.ta_name?.let { append(it) }
                household.household_size?.let {
                    if (isNotEmpty()) append(" · ")
                    append("$it members")
                }
            }.ifEmpty { null },
            showRule = true,
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Info card
            Surface(
                color = CardParchment,
                border = BorderStroke(1.dp, WarmStone),
                shape = RoundedCornerShape(2.dp),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    household.water_source?.let {
                        InfoRow("Water / Chizowiro", it)
                    }
                    if (household.gps_lat != null && household.gps_lon != null) {
                        InfoRow("GPS", "%.5f, %.5f".format(household.gps_lat, household.gps_lon))
                    }
                    InfoRow(
                        "Sync status",
                        if (household.sync_status == "synced") "Synced ✓"
                        else "Pending — will sync automatically",
                    )
                }
            }

            // Pregnancy
            if (pregnancy != null) {
                Surface(
                    color = CardParchment,
                    border = BorderStroke(1.dp, WarmStone),
                    shape = RoundedCornerShape(2.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Active pregnancy",
                                style = MaterialTheme.typography.titleMedium,
                            )
                            RiskBadge(
                                score = pregnancy.risk_score?.toInt()?.coerceIn(1, 10) ?: 5,
                                size = BadgeSize.SMALL,
                            )
                        }
                        Text(
                            pregnancy.woman_name ?: "Unnamed",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Button(
                            onClick = { onStartVisit("pregnancy") },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Text("Start ANC visit / Yambitsani odalira ANC")
                        }
                    }
                }
            }

            // Children
            children.forEach { child ->
                Surface(
                    color = CardParchment,
                    border = BorderStroke(1.dp, WarmStone),
                    shape = RoundedCornerShape(2.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                child.child_name ?: "Child",
                                style = MaterialTheme.typography.titleMedium,
                            )
                            RiskBadge(
                                score = child.risk_score?.toInt()?.coerceIn(1, 10) ?: 5,
                                size = BadgeSize.SMALL,
                            )
                        }
                        Text(
                            "MUAC: ${child.muac ?: "-"} · Risk: ${child.risk_category ?: "-"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedInk,
                        )
                        OutlinedButton(
                            onClick = { onStartVisit("child") },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Text("Start sick-child visit / Odalira mwana)")
                        }
                    }
                }
            }

            // Empty state
            if (pregnancy == null && children.isEmpty()) {
                EmptyState(
                    title = "No active patients",
                    subtitle = "Palipo odwala amene ali ndi matenda pano.",
                )
            }

            // Register buttons
            Text("Register patient / Yambitsani odwala", style = MaterialTheme.typography.titleSmall, color = Pine)
            Button(
                onClick = onRegisterPregnancy,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Pine),
            ) {
                Text("+ Register Pregnancy", color = Parchment, style = MaterialTheme.typography.titleMedium)
            }
            OutlinedButton(
                onClick = onRegisterChild,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                border = BorderStroke(1.dp, Pine),
            ) {
                Text("+ Register Child", color = Pine, style = MaterialTheme.typography.titleMedium)
            }

            Spacer(Modifier.height(8.dp))

            // SAMALA-AI: View knowledge assets for this household
            Surface(
                color = Ochre.copy(alpha = 0.08f),
                border = BorderStroke(1.dp, Ochre.copy(alpha = 0.3f)),
                shape = RoundedCornerShape(4.dp),
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "Knowledge for this household",
                        style = MaterialTheme.typography.titleSmall,
                        color = Ochre,
                    )
                    Text(
                        "View health guides and assets matched to this household's profile",
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedInk,
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = onViewKnowledge,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Ochre),
                    ) {
                        Text("View Knowledge / Onani Chidziwitso", color = Parchment)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            "$label: ",
            style = MaterialTheme.typography.bodySmall,
            color = MutedInk,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
