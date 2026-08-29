package com.zisamale.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zisamale.ui.theme.*

/**
 * Risk Badge — square stamp matching web RiskBadge.tsx (2dp radius).
 * Score ranges: 1-3 low, 4-6 medium, 7-8 high, 9-10 critical
 */
@Composable
fun RiskBadge(
    score: Int,
    modifier: Modifier = Modifier,
    size: BadgeSize = BadgeSize.MEDIUM,
    showLabel: Boolean = true,
) {
    val (bgColor, textColor, label) = when {
        score <= 3 -> Triple(RiskLow, Color.White, "LOW")
        score <= 6 -> Triple(RiskMedium, Ink, "MEDIUM")
        score <= 8 -> Triple(RiskHigh, Color.White, "HIGH")
        else -> Triple(RiskCritical, Color.White, "CRITICAL")
    }

    val (fontSize, horizontalPadding, verticalPadding) = when (size) {
        BadgeSize.SMALL -> Triple(10.sp, 6.dp, 2.dp)
        BadgeSize.MEDIUM -> Triple(11.sp, 10.dp, 4.dp)
        BadgeSize.LARGE -> Triple(13.sp, 14.dp, 6.dp)
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(2.dp))
            .background(bgColor)
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(
            text = if (showLabel) label else "$score",
            color = textColor,
            fontSize = fontSize,
            fontWeight = FontWeight.Bold,
        )
    }
}

enum class BadgeSize { SMALL, MEDIUM, LARGE }
