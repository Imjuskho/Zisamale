package com.zisamale.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ─── Zisamale Design Tokens (matching web Tailwind config) ───

val ZisamaleGreen = Color(0xFF2D7D46)
val ZisamaleGreenDark = Color(0xFF1B5E20)
val ZisamaleGreenLight = Color(0xFFE8F5E9)
val ZisamaleTeal = Color(0xFF0F7B8A)
val ZisamaleTealDark = Color(0xFF004D56)
val ZisamaleTealLight = Color(0xFFE0F2F1)
val ZisamaleDark = Color(0xFF1A1A2E)
val ZisamaleLight = Color(0xFFF5F5F0)

val RiskCritical = Color(0xFFC62828)
val RiskCriticalLight = Color(0xFFFFEBEE)
val RiskHigh = Color(0xFFE65100)
val RiskHighLight = Color(0xFFFFF3E0)
val RiskMedium = Color(0xFFF9A825)
val RiskMediumLight = Color(0xFFFFFDE7)
val RiskLow = Color(0xFF2E7D32)
val RiskLowLight = Color(0xFFE8F5E9)
val InfoBlue = Color(0xFF1565C0)
val InfoBlueLight = Color(0xFFE3F2FD)
val NeutralGray = Color(0xFF616161)
val SurfaceBorder = Color(0xFFE0E0E0)

private val LightColors = lightColorScheme(
    primary = ZisamaleGreen,
    onPrimary = Color.White,
    primaryContainer = ZisamaleGreenLight,
    onPrimaryContainer = ZisamaleDark,
    secondary = ZisamaleTeal,
    onSecondary = Color.White,
    secondaryContainer = ZisamaleTealLight,
    onSecondaryContainer = ZisamaleDark,
    background = ZisamaleLight,
    onBackground = ZisamaleDark,
    surface = Color.White,
    onSurface = ZisamaleDark,
    error = RiskCritical,
    onError = Color.White,
    surfaceVariant = SurfaceBorder,
    onSurfaceVariant = NeutralGray,
)

private val DarkColors = darkColorScheme(
    primary = ZisamaleGreen,
    onPrimary = Color.White,
    primaryContainer = ZisamaleGreenDark,
    onPrimaryContainer = ZisamaleGreenLight,
    secondary = ZisamaleTeal,
    onSecondary = Color.White,
    secondaryContainer = ZisamaleTealDark,
    onSecondaryContainer = ZisamaleTealLight,
    background = Color(0xFF121212),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF1E1E1E),
    onSurface = Color(0xFFE0E0E0),
    error = RiskCritical,
    onError = Color.White,
    surfaceVariant = Color(0xFF333333),
    onSurfaceVariant = Color(0xFFA0A0A0),
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
