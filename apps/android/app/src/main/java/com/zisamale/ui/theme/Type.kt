@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)

package com.zisamale.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

import com.zisamale.R

/**
 * Editorial voice: Source Serif 4 for display/headline (the "publication"
 * register), Space Grotesk for UI/body/data. Variable fonts registered
 * with explicit weight variation settings so FontWeight resolves to real
 * instances, not synthetic bold. Noto Sans remains the system fallback
 * for Chichewa glyphs via FontFamily.Default chains.
 */

val SerifDisplay = FontFamily(
    Font(
        resId = R.font.source_serif_4,
        weight = FontWeight.Bold,
        variationSettings = FontVariation.Settings(FontVariation.weight(700)),
    ),
)

val GroteskUi = FontFamily(
    Font(
        resId = R.font.space_grotesk,
        weight = FontWeight.Normal,
        variationSettings = FontVariation.Settings(FontVariation.weight(400)),
    ),
    Font(
        resId = R.font.space_grotesk,
        weight = FontWeight.Medium,
        variationSettings = FontVariation.Settings(FontVariation.weight(500)),
    ),
    Font(
        resId = R.font.space_grotesk,
        weight = FontWeight.SemiBold,
        variationSettings = FontVariation.Settings(FontVariation.weight(600)),
    ),
    Font(
        resId = R.font.space_grotesk,
        weight = FontWeight.Bold,
        variationSettings = FontVariation.Settings(FontVariation.weight(700)),
    ),
)

val ZisamaleTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = SerifDisplay,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.2).sp,
        color = Ink,
    ),
    headlineLarge = TextStyle(
        fontFamily = SerifDisplay,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 31.sp,
        color = Ink,
    ),
    headlineMedium = TextStyle(
        fontFamily = SerifDisplay,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 27.sp,
        color = Ink,
    ),
    titleLarge = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 25.sp,
        color = Ink,
    ),
    titleMedium = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 23.sp,
        color = Ink,
    ),
    bodyLarge = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
        color = Ink,
    ),
    bodyMedium = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp,
        color = Ink,
    ),
    bodySmall = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp,
        color = MutedInk,
    ),
    labelLarge = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        letterSpacing = 0.5.sp,
        color = MutedInk,
    ),
    labelMedium = TextStyle(
        fontFamily = GroteskUi,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.6.sp,
        color = MutedInk,
    ),
)
