package com.zisamale.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.zisamale.ui.theme.*

/**
 * Sync Indicator — shows sync status with icon and label.
 * 1:1 parity with web SyncIndicator.tsx
 */
@Composable
fun SyncIndicator(
    status: SyncStatus,
    modifier: Modifier = Modifier,
    count: Int? = null,
    total: Int? = null,
) {
    val (color, label, icon) = when (status) {
        SyncStatus.SYNCED -> Triple(RiskLow, "Synced", Icons.Default.CheckCircle)
        SyncStatus.SYNCING -> Triple(
            ZisamaleTeal,
            "${count ?: 0}/${total ?: 0}",
            Icons.Default.CheckCircle,
        )
        SyncStatus.OFFLINE -> Triple(NeutralGray, "Offline", Icons.Default.Warning)
        SyncStatus.ERROR -> Triple(RiskCritical, "Error", Icons.Default.Warning)
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
            color = color,
        )
    }
}

enum class SyncStatus { SYNCED, SYNCING, OFFLINE, ERROR }

/**
 * Empty State — placeholder when no data is available.
 * 1:1 parity with web EmptyState.tsx
 */
@Composable
fun EmptyState(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(SurfaceBorder.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = NeutralGray,
                modifier = Modifier.size(36.dp),
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = ZisamaleDark,
        )
        if (subtitle != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = NeutralGray,
            )
        }
        if (actionLabel != null && onAction != null) {
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(containerColor = ZisamaleGreen),
            ) {
                Text(actionLabel)
            }
        }
    }
}

/**
 * Offline Banner — shows when device is offline.
 * 1:1 parity with web OfflineBanner.tsx
 */
@Composable
fun OfflineBanner(
    modifier: Modifier = Modifier,
    onSync: (() -> Unit)? = null,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = RiskHigh,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = "You are offline. Data may be outdated.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White,
            )
            if (onSync != null) {
                TextButton(onClick = onSync) {
                    Text("SYNC NOW", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
