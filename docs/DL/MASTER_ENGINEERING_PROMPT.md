# ZISAMALE — SURVEILLANCE HONESTY & CROSS-PLATFORM SYNC
## Engineering Brief — Version 1.0
## Scope: Web dashboards + Android app + Grant reporting

---

## EXECUTIVE SUMMARY

Ship three surveillance-honesty features and one cross-platform design sync. 
All work is additive — nothing breaks existing functionality. All changes use 
the editorial design system (Source Serif 4, Space Grotesk, parchment canvas, 
2px radius, structural rules) that just shipped on web.

---

## PART A: DATA FRESHNESS BADGE (Small — 2–3 hours)

### What
A visible "Data as of" indicator on every data-driven widget. Not a tooltip — 
part of the component chrome. Color-coded by freshness:

| Freshness | Age | Color | Badge Text |
|-----------|-----|-------|------------|
| Live | < 7 days | Pine #2D6A4F | "Live" |
| Recent | 7–30 days | Sage #8FA89B | "3 weeks old" |
| Stale | 30–180 days | Terracotta #C0563B | "4 months old" |
| Historic | > 180 days | Blood #8C2F1B | "2 years old" |

### Why
Dr. Chirwa and the Principal Secretary need to know if they're looking at 
stale data before making decisions. Currently the dashboard presents everything 
as equally current. With DHIS2 data 2 years behind in some facilities, this is 
a safety issue.

### Where It Goes
- KPICard (next to the value)
- DistrictCard (in the footer, replacing "0 alerts · 0 stockouts")
- AlertCard (below the prediction, above actions)
- Chart containers (below the chart title)
- Map legend panel

### API Contract
Add to every data-source response:
```typescript
interface DataSourceMeta {
  source: "dhis2" | "ichis" | "lmis" | "chw" | "climate";
  last_sync_at: ISO8601 | null;
  record_count: number;        // how many records in this aggregation
  expected_count: number;      // how many records SHOULD exist
  freshness_score: "live" | "recent" | "stale" | "historic";
}
```

If `last_sync_at` is null, render "Never synced" in blood red.

### Component
```tsx
// src/components/DataFreshnessBadge.tsx
interface Props {
  meta: DataSourceMeta;
  showSource?: boolean;        // show "DHIS2" label
  compact?: boolean;           // inline vs. block
}
```

Styling:
- Inline: 11px Space Grotesk, uppercase, letter-spacing 0.05em, left border 2px
- Block: full-width pill, 12px, with source icon + age + record ratio

### Acceptance Criteria
- [ ] Every KPICard on MoHP shows freshness
- [ ] Every DistrictCard footer shows freshness instead of static "0 alerts"
- [ ] If `last_sync_at` is null, badge is blood red and says "Never synced"
- [ ] Badge is keyboard-focusable and screen-reader announces age
- [ ] tsc clean, tests pass

---

## PART B: CHW-FIRST SURVEILLANCE DASHBOARD (Medium — 1–2 days)

### What
A new dashboard view — `/surveillance/chw` — that treats CHW visit data as 
the primary surveillance signal. Not replacing MoHP. Alongside it. A tab or 
nav item: "Facility View" / "Field View".

### Why
DHIS2 is 2 years stale in many facilities. CHW visit data (MAMA-AI) is real-time, 
on-device, and doesn't depend on facility reporting. This is the data we actually 
have. The grant narrative shifts from "enhancing DHIS2" to "building intelligence 
that works despite broken facility infrastructure."

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  01 Field Surveillance                          [Facility ▼]  │
│  ─────────────────────────────────────────────────────────  │
│  Real-time signal from 450 CHWs across 3 districts          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 1,247        │ │ 23           │ │ 8            │        │
│  │ Visits this  │ │ Fever        │ │ Danger-sign  │        │
│  │ week         │ │ clusters     │ │ referrals    │        │
│  │ LIVE         │ │ LIVE         │ │ LIVE         │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ TA Heatmap (CHW data)  │ │ Trend: Fever reports   │      │
│  │                        │ │ by TA, 4 weeks         │      │
│  │  Green = low activity  │ │                        │      │
│  │  Amber = elevated      │ │  Pine = this week      │      │
│  │  Red = danger-sign     │ │  Sage = last week      │      │
│  │    cluster             │ │  Stone = 2–4 weeks ago   │      │
│  └────────────────────────┘ └────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  CHW Override Patterns — "Why are CHWs disagreeing with     │
│  the AI more in Nsanje this month?"                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Reason              │ Count │ Trend │ Districts       │   │
│  │ Patient refused     │  34   │ ↑ 12% │ Nsanje, Neno    │   │
│  │ Cultural factors    │  28   │ ↑ 8%  │ Nsanje          │   │
│  │ Symptoms changed    │  19   │ → 0%  │ Blantyre        │   │
│  │ I know this family  │  15   │ ↓ 3%  │ Neno            │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Data Comparison: CHW-reported vs. DHIS2-facility           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ District │ CHW fever │ DHIS2 malaria │ Gap │ Age     │   │
│  │ Nsanje   │ 127       │ 23            │ 104 │ 18 mo   │   │
│  │ Neno     │ 89        │ 41            │ 48  │ 14 mo   │   │
│  │ Blantyre │ 156       │ 112           │ 44  │ 6 mo    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints Needed

```
GET /api/v1/surveillance/chw/summary
  → visits_this_week, fever_clusters, danger_sign_referrals

GET /api/v1/surveillance/chw/heatmap
  → ta-level aggregation of symptoms, overrides, referrals

GET /api/v1/surveillance/chw/overrides
  → grouped by reason, with trend and district breakdown

GET /api/v1/surveillance/chw-vs-dhis2
  → district-level comparison of CHW-reported symptoms vs. DHIS2 confirmed cases
```

### Data Sources
- `visits` table (already synced from CHW app)
- `symptoms` JSONB field (danger signs, fever, cough, etc.)
- `chw_override_reason` (already required on override)
- DHIS2 pull (for comparison column)

### Acceptance Criteria
- [ ] New route `/surveillance/chw` accessible from sidebar
- [ ] KPIs show "LIVE" freshness badge
- [ ] TA heatmap uses CHW symptom data, not DHIS2 case counts
- [ ] Override patterns table shows real aggregated data
- [ ] CHW vs. DHIS2 comparison table highlights gaps in terracotta
- [ ] All text uses `useT()` (Chichewa/English)
- [ ] tsc clean, tests pass

---

## PART C: DATA GAP NLG REPORT TEMPLATE (Small — 3–4 hours)

### What
An auto-generated monthly report template for grant reporting. Honest about 
data quality. Turns a liability (broken DHIS2) into a strength (CHW data fills 
the gap).

### Template

```
ZISAMALE MONTHLY FIELD INTELLIGENCE REPORT
Month: {{month}} | Districts: {{districts}} | CHWs Active: {{chw_count}}

─────────────────────────────────────────────────────────────────

UPSTREAM DATA QUALITY

DHIS2 facility reporting: {{dhis2_coverage}}% of facilities 
reported this month ({{dhis2_expected}} expected, {{dhis2_actual}} 
received). Average reporting lag: {{dhis2_lag_months}} months.

iCHIS/CHT sync: {{ichis_coverage}}% of CHWs synced within 7 days.
{{ichis_stale_count}} CHWs have not synced in >14 days.

LMIS stock data: {{lmis_coverage}}% of facilities reported stock 
levels. {{lmis_stockout_count}} facilities reported stockouts.

CLIMATE DATA: Live. CHIRPS rainfall, ERA5 temperature, MODIS 
vegetation indices current through {{climate_date}}.

─────────────────────────────────────────────────────────────────

FIELD SIGNAL (PRIMARY)

This month, {{chw_visit_count}} home visits were conducted by 
{{chw_active_count}} CHWs. Of these:

  • {{fever_count}} patients reported fever
  • {{danger_sign_count}} patients exhibited danger signs
  • {{referral_count}} emergency referrals were initiated
  • {{override_count}} AI recommendations were overridden by CHWs

Top override reasons:
{{#overrides}}
  {{rank}}. {{reason}} — {{count}} times ({{trend}})
{{/overrides}}

CHW override is a training signal, not a failure. Each override 
is reviewed by the supervisor and fed back into model retraining.

─────────────────────────────────────────────────────────────────

SURVEILLANCE OUTLOOK

{{#outbreaks}}
  {{disease}} risk in {{district}}: {{risk_level}}
  Prediction horizon: {{horizon}} weeks
  Model confidence: {{confidence}}%
  Data quality: {{data_quality}} — {{data_quality_note}}
{{/outbreaks}}

{{^outbreaks}}
  No outbreak predictions exceeded threshold this month.
{{/outbreaks}}

─────────────────────────────────────────────────────────────────

MODEL PERFORMANCE

MAMA-AI edge model (on-device risk scoring):
  • Inference time: {{mama_inference_ms}}ms average
  • CHW override rate: {{mama_override_rate}}%
  • Top override reason: {{mama_top_override}}

ULALO-AI surveillance model:
  • Predictions generated: {{ulalo_predictions}}
  • Validated against DHIS2: {{ulalo_validated}} ({{ulalo_validation_note}})
  • CHW-reported validation: {{ulalo_chw_validation}}

─────────────────────────────────────────────────────────────────

RECOMMENDATION FOR GRANT REPORTING

Zisamale's surveillance layer does not depend on complete DHIS2 
reporting. In environments where facility data is {{dhis2_lag_months}} 
months stale, CHW-reported symptoms provide a real-time signal 
that is {{chw_data_freshness}} current.

The platform's value is not in replacing DHIS2. It is in building 
an intelligence layer that works with the data that actually exists.

─────────────────────────────────────────────────────────────────

Generated by Zisamale AI | {{generated_at}}
```

### Implementation

```typescript
// src/lib/nlg/dataGapReport.ts
export function generateDataGapReport(
  month: string,
  data: DataGapReportInput
): string {
  // Returns the formatted report above
}

// src/components/nlg/DataGapReportView.tsx
// Rendered as a printable/downloadable page
// Styled with the editorial system: Source Serif 4 headlines,
// Space Grotesk body, thin rules, 2px radius on action buttons
```

### Export Formats
- `.txt` (already exists for NLG summary)
- `.pdf` (use existing PDFExport component if wired, else defer)
- Print stylesheet: A4, 2cm margins, serif body, page-break-before sections

### Acceptance Criteria
- [ ] Template renders with real data from all sources
- [ ] DHIS2 lag is prominently disclosed, not hidden
- [ ] CHW data is positioned as the primary signal
- [ ] Report is downloadable as .txt
- [ ] Print stylesheet produces Cabinet-ready document
- [ ] tsc clean, tests pass

---

## PART D: ANDROID DESIGN SYSTEM SYNC (Medium — 1–2 days)

### What
Bring the Android app into visual parity with the web editorial system. 
The Android theme currently mirrors the OLD token set (Zisamale Green, 
Zisamale Teal, 16dp radius). It needs to match the new editorial language.

### Why
Cross-platform consistency is a grant deliverable. The Principal Secretary 
sees the MoHP dashboard on web. Grace sees the CHW app on Android. They 
must feel like the same system. Currently they don't.

### Files to Modify

#### `apps/android/app/src/main/java/com/zisamale/ui/theme/Color.kt`

```kotlin
// NEW editorial palette
val Parchment = Color(0xFFF5F2EB)
val CardParchment = Color(0xFFFBF9F4)
val Ink = Color(0xFF1C1917)
val WarmStone = Color(0xFFD6D3CD)

val Pine = Color(0xFF1B4332)
val PineHover = Color(0xFF143828)
val Sage = Color(0xFF8FA89B)
val StoneBlue = Color(0xFF3F5E7A)

val Terracotta = Color(0xFFC0563B)
val Blood = Color(0xFF8C2F1B)

val RiskLow = Color(0xFF2D6A4F)
val RiskMedium = Color(0xFFB45309)
val RiskHigh = Color(0xFFC0563B)
val RiskCritical = Color(0xFF8C2F1B)
```

#### `apps/android/app/src/main/java/com/zisamale/ui/theme/Type.kt`

```kotlin
// Add Source Serif 4 for display/headline
// Add Space Grotesk for body/UI
// Keep Noto Sans as Chichewa fallback

val Display = TextStyle(
    fontFamily = FontFamily(Font(R.font.source_serif_4)),
    fontWeight = FontWeight.Bold,
    fontSize = 30.sp,
    lineHeight = 36.sp
)

val Headline = TextStyle(
    fontFamily = FontFamily(Font(R.font.source_serif_4)),
    fontWeight = FontWeight.SemiBold,
    fontSize = 24.sp,
    lineHeight = 31.sp
)

val Title = TextStyle(
    fontFamily = FontFamily(Font(R.font.space_grotesk)),
    fontWeight = FontWeight.SemiBold,
    fontSize = 18.sp,
    lineHeight = 25.sp
)

val Body = TextStyle(
    fontFamily = FontFamily(Font(R.font.space_grotesk)),
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 21.sp
)

val Caption = TextStyle(
    fontFamily = FontFamily(Font(R.font.space_grotesk)),
    fontWeight = FontWeight.Medium,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.05.em
)
```

#### `apps/android/app/src/main/java/com/zisamale/ui/theme/Shape.kt`

```kotlin
// Change from 16dp/12dp/8dp to 2dp everywhere
val Shapes = Shapes(
    small = RoundedCornerShape(2.dp),
    medium = RoundedCornerShape(2.dp),
    large = RoundedCornerShape(2.dp),
    extraLarge = RoundedCornerShape(2.dp)
)
// EXCEPTION: indicator dots and EmptyState seal keep 50%
```

#### `apps/android/app/src/main/java/com/zisamale/ui/theme/Theme.kt`

```kotlin
// Update lightColorScheme and darkColorScheme to use new tokens
// Dark mode: warm charcoal background, lifted pine accents
```

#### Component Updates

| Component | Change |
|-----------|--------|
| `RiskBadge.kt` | Circle → Square (2dp radius). Size stays 48dp. |
| `AlertCard.kt` | Remove shadow. Add 1px WarmStone border. Critical alerts get 4dp Terracotta left border. |
| `PatientCard.kt` | Remove shadow. 1px border. 2dp radius. |
| `Stepper.kt` | 2dp radius on buttons. Remove elevation. |
| `VisitForm.kt` | Section headers get thin rule above (1px WarmStone). |
| `Dashboard.kt` | Page title in Source Serif 4. "01 Today's Visits" section number in Terracotta. |
| `SyncIndicator.kt` | Square dot (4dp), not circle. |

### Font Assets
Add to `apps/android/app/src/main/res/font/`:
- `source_serif_4.ttf` (or variable font)
- `space_grotesk.ttf` (or variable font)
- Keep `noto_sans.ttf` for Chichewa fallback

### Acceptance Criteria
- [ ] Android app builds without R8 errors
- [ ] All screens render with new palette (screenshot comparison against web)
- [ ] RiskBadge is square, not circle
- [ ] Cards have 1px borders, no shadows
- [ ] Section headers have thin rules
- [ ] Chichewa text falls back to Noto Sans correctly
- [ ] Dark mode uses warm charcoal, not pure black
- [ ] Unit tests pass (59/59 or more)

---

## DEPENDENCIES BETWEEN PARTS

```
Part A (Freshness Badge)
  └── Needs: API `last_sync_at` field (backend, small)
  └── Blocks: Nothing

Part B (CHW Surveillance Dashboard)
  └── Needs: Part A (freshness badges on KPIs)
  └── Needs: New API endpoints (backend, medium)
  └── Blocks: Nothing

Part C (Data Gap NLG Report)
  └── Needs: Part A (freshness data for report)
  └── Needs: Part B (CHW vs. DHIS2 comparison data)
  └── Blocks: Nothing

Part D (Android Sync)
  └── Needs: Font files (design asset, small)
  └── Blocks: Nothing
  └── NOTE: Can be done in parallel with A/B/C
```

---

## SUGGESTED EXECUTION ORDER

| Day | Task | Owner |
|-----|------|-------|
| 1 | Part A: DataFreshnessBadge component + API contract | Frontend |
| 1 | Part D: Add font files + Color.kt + Type.kt | Android |
| 2 | Part A: Wire freshness into all existing cards | Frontend |
| 2 | Part D: Update Shape.kt + Theme.kt + RiskBadge | Android |
| 3 | Part B: New API endpoints (CHW aggregation) | Backend |
| 3 | Part D: Update AlertCard, PatientCard, Stepper | Android |
| 4 | Part B: CHW Surveillance Dashboard page | Frontend |
| 4 | Part D: Screenshot regression against web | Android |
| 5 | Part C: NLG template + DataGapReportView | Frontend |
| 5 | Part D: Final polish, dark mode verification | Android |
| 6 | Integration testing, cross-platform visual review | Both |

---

## GRANT NARRATIVE SHIFT

Update the grant application's surveillance section to:

> "In Malawi, facility-based reporting through DHIS2 is incomplete — 
> many facilities are 18+ months behind on data entry. Zisamale does not 
> depend on complete facility data. Instead, it builds a real-time 
> intelligence layer on CHW-reported symptoms, processed by edge-AI on 
> $100 Android devices, synced opportunistically over 2G/3G. The 
> platform is honest about data quality: every widget shows a freshness 
> badge, and the monthly report discloses upstream gaps transparently."

This turns infrastructure weakness into methodological strength.

---

## DEFERRED (DO NOT DO NOW)

- Real GADM boundaries (large, blocks scale-up but not pilot)
- 7-day airplane-mode E2E test (deferred in ANDROID_APP_SCOPE)
- Certified Chichewa translator (waiting on budget decision from you)
- PDF export of Data Gap report (use .txt for now)

---

END OF BRIEF
