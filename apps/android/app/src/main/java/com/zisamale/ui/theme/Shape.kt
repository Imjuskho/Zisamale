package com.zisamale.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// Editorial form language: square corners everywhere (0-2dp).
// EXCEPTION: indicator dots and circular seals keep 50% - set those
// locally with CircleShape, not through this token set.
val ZisamaleShapes = Shapes(
    small = RoundedCornerShape(2.dp),
    medium = RoundedCornerShape(2.dp),
    large = RoundedCornerShape(2.dp),
    extraLarge = RoundedCornerShape(2.dp),
)
