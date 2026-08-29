// apps/android/app/src/main/java/com/zisamale/ui/theme/Shape.kt
// 2dp radius everywhere — editorial, not consumer-app
// Exception: indicator dots and EmptyState seal keep 50%

package com.zisamale.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val ZisamaleShapes = Shapes(
    extraSmall = RoundedCornerShape(2.dp),
    small = RoundedCornerShape(2.dp),
    medium = RoundedCornerShape(2.dp),
    large = RoundedCornerShape(2.dp),
    extraLarge = RoundedCornerShape(2.dp)
)

// For indicator dots, avatars, seals — the rare circles
val CircleShape = androidx.compose.foundation.shape.CircleShape
