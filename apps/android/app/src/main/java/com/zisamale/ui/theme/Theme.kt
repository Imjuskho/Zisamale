package com.zisamale.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Editorial light scheme: parchment canvas, ink text, pine primary.
private val LightColors = lightColorScheme(
    primary = Pine,
    onPrimary = Color.White,
    primaryContainer = RiskLowLight,
    onPrimaryContainer = Ink,
    secondary = StoneBlue,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE5ECF1),
    onSecondaryContainer = Ink,
    background = Parchment,
    onBackground = Ink,
    surface = CardParchment,
    onSurface = Ink,
    error = Blood,
    onError = Color.White,
    surfaceVariant = WarmStoneLight,
    onSurfaceVariant = MutedInk,
)

// Lamplight dark scheme: warm charcoal (never pure black), lifted pine.
private val DarkColors = darkColorScheme(
    primary = PineLifted,
    onPrimary = DarkCanvas,
    primaryContainer = Color(0xFF1D2B23),
    onPrimaryContainer = DarkText,
    secondary = SageLifted,
    onSecondary = DarkCanvas,
    secondaryContainer = Color(0xFF1E2C24),
    onSecondaryContainer = DarkText,
    background = DarkCanvas,
    onBackground = DarkText,
    surface = DarkCard,
    onSurface = DarkText,
    error = CriticalLifted,
    onError = DarkCanvas,
    surfaceVariant = Color(0xFF2A251F),
    onSurfaceVariant = DarkMuted,
)

@Composable
fun ZisamaleTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colors,
        typography = ZisamaleTypography,
        shapes = ZisamaleShapes,
        content = content,
    )
}
