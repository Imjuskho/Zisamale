package com.zisamale.ui.theme

import androidx.compose.ui.graphics.Color

// ─── Apple Design System Tokens (matching web tailwind.config.js + index.css) ───
// Single blue accent, near-invisible chrome, premium whitespace.
// Pill shapes (Shape.kt), 1px hairline borders, no decorative shadows.

// Canvas + surfaces
val Parchment = Color(0xFFFFFFFF)        // Apple canvas (white)
val CardParchment = Color(0xFFFAFAFC)    // Apple pearl
val Ink = Color(0xFF1D1D1F)              // Apple ink
val WarmStone = Color(0xFFE8E8ED)        // Apple hairline
val WarmStoneLight = Color(0xFFF0F0F0)   // Apple divider
val MutedInk = Color(0xFF8E8E93)         // Apple gray500

// Brand — single accent
val Pine = Color(0xFF0066CC)             // Apple action blue
val PineHover = Color(0xFF0071E3)        // Apple focus blue
val Sage = Color(0xFFAEAEB2)            // Apple gray400
val StoneBlue = Color(0xFF0066CC)       // Apple action blue

// Urgency ladder (data only - Apple system colors)
val Terracotta = Color(0xFFFF9500)      // Apple orange
val Blood = Color(0xFFFF3B30)           // Apple red

// Risk scale — Apple system semantic
val RiskLow = Color(0xFF34C759)         // Apple green
val RiskMedium = Color(0xFFFFCC00)      // Apple yellow
val RiskHigh = Color(0xFFFF9500)        // Apple orange
val RiskCritical = Color(0xFFFF3B30)    // Apple red
val RiskNoData = Color(0xFFAEAEB2)      // Apple gray400

// SAMALA accent + gray scale
val Ochre = Color(0xFFFF9500)           // Apple orange
val Stone100 = Color(0xFFF5F5F7)        // Apple gray100
val Stone200 = Color(0xFFE8E8ED)        // Apple gray200
val Stone400 = Color(0xFFAEAEB2)        // Apple gray400
val Stone500 = Color(0xFF8E8E93)        // Apple gray500
val Stone600 = Color(0xFF636366)        // Apple gray600

// Light tints — Apple system
val RiskLowLight = Color(0x1434C759)    // Apple green 8%
val RiskMediumLight = Color(0x14FFCC00) // Apple yellow 8%
val RiskHighLight = Color(0x14FF9500)   // Apple orange 8%
val RiskCriticalLight = Color(0x14FF3B30) // Apple red 8%

// Legacy aliases kept so existing components compile during migration
val ZisamaleGreen = Pine
val ZisamaleGreenDark = PineHover
val ZisamaleGreenLight = RiskLowLight
val ZisamaleTeal = StoneBlue
val ZisamaleTealDark = Color(0xFF005BB5)
val ZisamaleTealLight = Color(0x140066CC)
val ZisamaleDark = Ink
val ZisamaleLight = Parchment
val InfoBlue = StoneBlue
val InfoBlueLight = Color(0x140066CC)
val NeutralGray = MutedInk
val SurfaceBorder = WarmStone

// Apple true dark mode
val DarkCanvas = Color(0xFF1C1C1E)      // Apple dark surface-bg
val DarkCard = Color(0xFF2C2C2E)        // Apple dark surface
val DarkBorder = Color(0xFF3A3A3C)      // Apple dark border
val DarkText = Color(0xFFFFFFFF)        // Apple dark text
val DarkMuted = Color(0xFF8E8E93)       // Apple gray500
val PineLifted = Color(0xFF2997FF)      // Apple blue on dark
val SageLifted = Color(0xFFAEAEB2)      // Apple gray400
val LowLifted = Color(0xFF30D158)       // Apple green on dark
val MediumLifted = Color(0xFFFFD60A)    // Apple yellow on dark
val HighLifted = Color(0xFFFF9F0A)      // Apple orange on dark
val CriticalLifted = Color(0xFFFF453A)  // Apple red on dark
