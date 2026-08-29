# Android Component Migration — Editorial Design System
## From: Zisamale Green/Teal/16dp radius  →  To: Pine/Sage/2dp radius

---

## Font Assets Required

Add to `apps/android/app/src/main/res/font/`:

| File | Weight | Source |
|------|--------|--------|
| `source_serif_4_regular.ttf` | 400 | Google Fonts |
| `source_serif_4_semibold.ttf` | 600 | Google Fonts |
| `source_serif_4_bold.ttf` | 700 | Google Fonts |
| `space_grotesk_regular.ttf` | 400 | Google Fonts |
| `space_grotesk_medium.ttf` | 500 | Google Fonts |
| `space_grotesk_semibold.ttf` | 600 | Google Fonts |
| `space_grotesk_bold.ttf` | 700 | Google Fonts |
| `noto_sans_regular.ttf` | 400 | Google Fonts (keep existing) |
| `noto_sans_medium.ttf` | 500 | Google Fonts (keep existing) |

Download: https://fonts.google.com/specimen/Source+Serif+4
Download: https://fonts.google.com/specimen/Space+Grotesk

---

## Component-by-Component Changes

### RiskBadge.kt
```kotlin
// BEFORE
Box(
    modifier = Modifier
        .size(48.dp)
        .clip(CircleShape)          // ← CIRCLE
        .background(riskColor),
    contentAlignment = Alignment.Center
) {
    Text(score.toString(), color = Color.White)
}

// AFTER
Box(
    modifier = Modifier
        .size(48.dp)
        .clip(RoundedCornerShape(2.dp))  // ← SQUARE, 2dp
        .background(riskColor)
        .border(1.dp, WarmStone, RoundedCornerShape(2.dp)),
    contentAlignment = Alignment.Center
) {
    Text(
        score.toString(),
        color = Color.White,
        style = MaterialTheme.typography.bodyMedium,
        fontWeight = FontWeight.Bold
    )
}
```

### AlertCard.kt
```kotlin
// BEFORE
Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(16.dp),   // ← 16dp
    elevation = CardDefaults.cardElevation(4.dp)  // ← SHADOW
) { ... }

// AFTER
Card(
    modifier = Modifier
        .fillMaxWidth()
        .border(1.dp, WarmStone, RoundedCornerShape(2.dp)),  // ← 2dp + BORDER
    shape = RoundedCornerShape(2.dp),
    colors = CardDefaults.cardColors(containerColor = CardParchment),
    elevation = CardDefaults.cardElevation(0.dp)  // ← NO SHADOW
) {
    // Critical alerts get left border
    if (severity == Severity.CRITICAL) {
        Box(modifier = Modifier.padding(start = 4.dp)) {  // 4dp terracotta border
            // content
        }
    }
}
```

### PatientCard.kt
```kotlin
// BEFORE
Card(
    shape = RoundedCornerShape(16.dp),
    elevation = CardDefaults.cardElevation(2.dp)
) { ... }

// AFTER
Card(
    modifier = Modifier.border(1.dp, WarmStone, RoundedCornerShape(2.dp)),
    shape = RoundedCornerShape(2.dp),
    colors = CardDefaults.cardColors(containerColor = CardParchment),
    elevation = CardDefaults.cardElevation(0.dp)
) { ... }
```

### VisitForm.kt — Section Headers
```kotlin
// AFTER — Add thin rule above section headers
Column(modifier = Modifier.fillMaxWidth()) {
    HorizontalDivider(
        color = WarmStone,
        thickness = 1.dp,
        modifier = Modifier.padding(vertical = 8.dp)
    )
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            "01",
            style = MaterialTheme.typography.labelMedium,
            color = Terracotta,
            modifier = Modifier.padding(end = 8.dp)
        )
        Text(
            "Vital Signs",
            style = MaterialTheme.typography.titleLarge,  // Space Grotesk
            color = Ink
        )
    }
}
```

### Dashboard.kt — Page Title
```kotlin
// AFTER
Column(modifier = Modifier.padding(16.dp)) {
    HorizontalDivider(color = Ink, thickness = 1.dp)  // Newspaper rule
    Spacer(modifier = Modifier.height(12.dp))
    Text(
        "Today's Visits",
        style = MaterialTheme.typography.displayMedium,  // Source Serif 4, 24sp
        color = Ink
    )
}
```

### SyncIndicator.kt
```kotlin
// BEFORE
Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))

// AFTER
Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(color))
```

### Stepper.kt
```kotlin
// BEFORE
Button(
    shape = RoundedCornerShape(12.dp),  // ← 12dp
    elevation = ButtonDefaults.buttonElevation(2.dp)
) { ... }

// AFTER
Button(
    modifier = Modifier.border(1.dp, WarmStone, RoundedCornerShape(2.dp)),
    shape = RoundedCornerShape(2.dp),   // ← 2dp
    elevation = ButtonDefaults.buttonElevation(0.dp),  // ← NO SHADOW
    colors = ButtonDefaults.buttonColors(
        containerColor = CardParchment,
        contentColor = Ink
    )
) { ... }
```

---

## Theme.kt Integration

Replace existing `ZisamaleTheme` with the new `Theme.kt` file. Key changes:

| Token | Old | New |
|-------|-----|-----|
| Background | `#F5F5F0` (warm white) | `#F5F2EB` (parchment) |
| Surface | `#FFFFFF` | `#FBF9F4` (card parchment) |
| Primary | `#2D7D46` (green) | `#1B4332` (pine) |
| Secondary | `#0F7B8A` (teal) | `#8FA89B` (sage) |
| Error | `#C62828` (red) | `#8C2F1B` (blood) |
| Outline | `#E0E0E0` | `#D6D3CD` (warm stone) |

---

## Shape System

Replace all `RoundedCornerShape(16.dp)`, `12.dp`, `8.dp` with `2.dp`.

Exceptions (keep as circles):
- Avatar images
- Sync status dots
- EmptyState seal/illustration
- FAB (if used — but prefer bottom bar per design spec)

---

## Elevation Removal

Search codebase for:
```
.cardElevation(
elevation =
shadowElevation
```

Replace with `0.dp` or remove. Elevation is now communicated through:
- 1px borders (`WarmStone`)
- Background color shifts (`Parchment` → `CardParchment`)
- Left accent borders (4dp `Terracotta` for critical alerts)

---

## Dark Mode

The new `Theme.kt` includes a warm charcoal dark mode:
- Background: `#1C1917` (warm charcoal, not pure black)
- Surface: `#292524` (lifted)
- Pine primary: `#2D6A4F` (brighter for dark)
- Text: `#F5F5F4` (warm white)

Test dark mode on:
- Dashboard
- Visit form
- Patient profile
- Risk badge (square, not circle)

---

## Verification Checklist

- [ ] App builds without R8 errors
- [ ] Source Serif 4 renders in headlines (check for tofu boxes on Chichewa chars)
- [ ] Space Grotesk renders in body text
- [ ] All cards have 2dp radius + 1px WarmStone border
- [ ] No shadows on cards (check with elevation overlay in dev tools)
- [ ] RiskBadge is square (screenshot compare against web)
- [ ] Critical alerts have 4dp terracotta left border
- [ ] Section headers have thin rule above
- [ ] Dark mode uses warm charcoal, not pure black
- [ ] Chichewa text falls back to Noto Sans (test: "ŵanthu", "ŋ'ombe")
- [ ] Unit tests pass (59/59 or more)
