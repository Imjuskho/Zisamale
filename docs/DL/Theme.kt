// apps/android/app/src/main/java/com/zisamale/ui/theme/Theme.kt
// Editorial design system — light & dark

package com.zisamale.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Pine,
    onPrimary = TextInverse,
    primaryContainer = PineHover,
    onPrimaryContainer = TextInverse,
    secondary = Sage,
    onSecondary = Ink,
    secondaryContainer = CardParchment,
    onSecondaryContainer = Ink,
    tertiary = StoneBlue,
    onTertiary = TextInverse,
    background = Parchment,
    onBackground = Ink,
    surface = CardParchment,
    onSurface = Ink,
    surfaceVariant = Parchment,
    onSurfaceVariant = TextSecondary,
    error = Blood,
    onError = TextInverse,
    outline = WarmStone,
    scrim = Ink.copy(alpha = 0.5f)
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPine,
    onPrimary = TextInverse,
    primaryContainer = Pine,
    onPrimaryContainer = TextInverse,
    secondary = Sage,
    onSecondary = DarkTextPrimary,
    secondaryContainer = DarkSurface,
    onSecondaryContainer = DarkTextPrimary,
    tertiary = StoneBlue,
    onTertiary = TextInverse,
    background = DarkCanvas,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkCanvas,
    onSurfaceVariant = DarkTextSecondary,
    error = Terracotta,
    onError = TextInverse,
    outline = DarkBorder,
    scrim = Ink.copy(alpha = 0.7f)
)

@Composable
fun ZisamaleTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ZisamaleTypography,
        shapes = ZisamaleShapes,
        content = content
    )
}
