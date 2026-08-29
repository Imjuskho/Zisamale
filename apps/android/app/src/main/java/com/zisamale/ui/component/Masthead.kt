package com.zisamale.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.ui.theme.*

/**
 * Editorial masthead — replaces TopAppBar on all screens.
 * Canvas background, serif title, hairline rule above when [showRule] is true.
 *
 * Hierarchy: title dominates, subtitle is muted support, rule is visual anchor.
 * Depth:     no fill, no shadow — the masthead IS the canvas.
 */
@Composable
fun Masthead(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    showRule: Boolean = true,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Column(modifier = modifier.fillMaxWidth()) {
        if (showRule) {
            Divider(
                color = Ink,
                thickness = 1.dp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(
                        Icons.Default.ArrowBack,
                        contentDescription = "Back / Bwezerani",
                        tint = Ink,
                    )
                }
                Spacer(Modifier.width(8.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineMedium,
                )
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedInk,
                    )
                }
            }
            Row { actions() }
        }
    }
}

/**
 * Simple page header with no rule — used inside scroll content
 * (e.g., LockScreen, Account tab).
 */
@Composable
fun PageHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
) {
    Column(modifier = modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        subtitle?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MutedInk)
        }
    }
}
