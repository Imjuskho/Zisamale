package com.zisamale.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zisamale.ui.theme.*

/**
 * Facility Intelligence Card — Moyo Map facility details for Android.
 * Shows bed count, stock status, staff on duty, road access, and actions.
 * 1:1 parity with web FacilityPanel.tsx
 */
@Composable
fun FacilityCard(
    name: String,
    facilityType: String,
    bedsAvailable: Int,
    bedsTotal: Int,
    stockStatus: String,
    staffOnDuty: String,
    roadStatus: String,
    isEmergencyReceiving: Boolean = false,
    modifier: Modifier = Modifier,
    onCall: (() -> Unit)? = null,
    onRefer: (() -> Unit)? = null,
) {
    val typeColor = when (facilityType) {
        "district_hospital" -> Color(0xFF1E40AF)
        "community_hospital" -> ZisamaleTeal
        "health_centre" -> ZisamaleGreen
        else -> NeutralGray
    }

    val statusColor = when {
        bedsAvailable > 10 -> RiskLow
        bedsAvailable > 3 -> RiskHigh
        else -> RiskCritical
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isEmergencyReceiving) 4.dp else 2.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = typeColor,
                    modifier = Modifier.size(24.dp),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = ZisamaleDark,
                    )
                    Text(
                        text = facilityType.replace("_", " ").uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        color = NeutralGray,
                    )
                }
                if (isEmergencyReceiving) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = RiskCritical,
                    ) {
                        Text(
                            text = "EMERGENCY",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Bed availability
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = "$bedsAvailable",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Bold,
                    ),
                    color = statusColor,
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "beds free of $bedsTotal",
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralGray,
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quick info
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                InfoChip(icon = Icons.Default.Inventory, label = stockStatus)
                InfoChip(icon = Icons.Default.Person, label = staffOnDuty)
                InfoChip(icon = Icons.Default.Warning, label = roadStatus)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                onCall?.let {
                    OutlinedButton(
                        onClick = it,
                        modifier = Modifier.weight(1f).height(48.dp),
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("CALL")
                    }
                }
                onRefer?.let {
                    Button(
                        onClick = it,
                        colors = ButtonDefaults.buttonColors(containerColor = ZisamaleGreen),
                        modifier = Modifier.weight(1f).height(48.dp),
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("REFER")
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoChip(icon: ImageVector, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = NeutralGray,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = NeutralGray,
        )
    }
}

/**
 * Referral Card — AI-ranked facility recommendation for Android.
 * 1:1 parity with web ReferralEngine.tsx referral cards.
 */
@Composable
fun ReferralCard(
    rank: Int,
    facilityName: String,
    distanceKm: Float,
    etaMinutes: Int,
    roadStatus: String,
    hasCapability: Boolean,
    hasBeds: Boolean,
    hasStock: Boolean,
    hasStaff: Boolean,
    recommended: Boolean,
    reachable: Boolean = true,
    modifier: Modifier = Modifier,
    onSelect: (() -> Unit)? = null,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (recommended) RiskLowLight.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (recommended) 3.dp else 1.dp),
        border = if (recommended) CardDefaults.outlinedCardBorder().takeIf { false } else null,
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            if (recommended) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = RiskLow,
                    modifier = Modifier.align(Alignment.End),
                ) {
                    Text(
                        text = "RECOMMENDED",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "#$rank",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = NeutralGray,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = facilityName,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = ZisamaleDark,
                    )
                    Text(
                        text = "${distanceKm}km · ${etaMinutes}min · Road: $roadStatus",
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralGray,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Capability checks
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CheckChip(label = "Capacity", passed = hasCapability)
                CheckChip(label = "Beds", passed = hasBeds)
                CheckChip(label = "Drugs", passed = hasStock)
                CheckChip(label = "Staff", passed = hasStaff)
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (reachable && onSelect != null) {
                Button(
                    onClick = onSelect,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (recommended) ZisamaleGreen else ZisamaleTeal,
                    ),
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                ) {
                    Text(if (recommended) "SEND REFERRAL" else "SELECT")
                }
            }
            if (!reachable) {
                Text(
                    text = "Cannot reach — $roadStatus",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                    color = RiskCritical,
                )
            }
        }
    }
}

@Composable
private fun CheckChip(label: String, passed: Boolean) {
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = if (passed) RiskLow.copy(alpha = 0.1f) else RiskCritical.copy(alpha = 0.1f),
    ) {
        Text(
            text = "${if (passed) "✓" else "✗"} $label",
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = if (passed) RiskLow else RiskCritical,
        )
    }
}
