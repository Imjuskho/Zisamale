package com.zisamale.ui.component

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.ui.theme.*

private val ChipShape = RoundedCornerShape(2.dp)

/**
 * Field chip — a large toggle control for danger signs / urgency selection.
 * Min 48dp hit area for gloved or sun-glare field use.
 *
 * Hierarchy: selected state is unmistakable via Pine background + white text;
 *            unselected is quiet warm-stone border + muted label.
 * Bilingual: [label] = English, [caption] = Chichewa (shown below label).
 */
@Composable
fun FieldChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    caption: String? = null,
) {
    Surface(
        onClick = onClick,
        shape = ChipShape,
        color = when {
            selected -> Pine
            else -> CardParchment
        },
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = when {
                selected -> Pine
                else -> WarmStone
            }
        ),
        modifier = modifier.heightIn(min = 48.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = when {
                        selected -> Parchment
                        else -> Ink
                    },
                )
                caption?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = when {
                            selected -> Sage
                            else -> MutedInk
                        },
                    )
                }
            }
            if (selected) {
                Spacer(Modifier.width(8.dp))
                Text("✓", color = Parchment, style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

/**
 * Urgency variant — semantic colors (routine=sage, urgent=amber, emergency=blood).
 */
@Composable
fun UrgencyChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = Pine,
) {
    Surface(
        onClick = onClick,
        shape = ChipShape,
        color = when {
            selected -> color
            else -> CardParchment
        },
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = when {
                selected -> color
                else -> WarmStone
            }
        ),
        modifier = modifier.heightIn(min = 48.dp),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            style = MaterialTheme.typography.titleMedium,
            color = when {
                selected -> Parchment
                else -> Ink
            },
        )
    }
}
