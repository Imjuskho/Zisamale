# ZISAMALE DESIGN SYSTEM & UI/UX SPECIFICATION
## Version 1.0 — Production-Grade Interface Standards for Malawi Health AI

---

## 1. DESIGN PHILOSOPHY: "KUFUNIKA KOYAMBIKA" (DESIGN FOR THE BEGINNER)

### 1.1 Core Principles

Every design decision must pass this hierarchy of needs:

1. **SURVIVAL:** Can a CHW complete a critical task (refer a dying child) in under 60 seconds, on a $100 phone, in direct sunlight, with sweaty hands, while a mother is screaming?
2. **TRUST:** Does the interface feel like it was made *for* Malawians, not *exported to* Malawi? Does it respect the CHW's 20 years of clinical experience?
3. **DIGNITY:** Does it make the CHW feel skilled and empowered, not monitored and surveilled?
4. **BEAUTY:** Only after the above are met.

### 1.2 The User Archetypes

| Archetype | Name | Context | Digital Literacy | Physical Environment | Emotional State |
|-----------|------|---------|-----------------|---------------------|-----------------|
| **CHW (Primary)** | Grace | 42, HSA for 18 years, first smartphone 6 months ago, walks 15km/day, earns ~$80/month | Low. Can make calls, send WhatsApp, struggles with typing. | Bright sun, dusty roads, rain, shared charger at clinic, 2G | Tired, proud of her work, skeptical of "computer people," anxious about making mistakes |
| **CHW Supervisor** | Mr. Banda | 35, nurse, manages 15 CHWs, uses a tablet at the clinic | Medium. Uses Excel, Facebook, sometimes struggles with new apps. | Clinic office, intermittent power, shared laptop | Overwhelmed by reports, wants to help his CHWs succeed, frustrated by system failures |
| **DHO Surveillance Officer** | Dr. Chirwa | 38, epidemiologist, laptop user, attends weekly surveillance meetings | High. Comfortable with DHIS2, Excel, email. | District office, shared internet, frequent power cuts | Stressed during outbreaks, needs information fast, distrusts automated alerts without context |
| **MoHP Policymaker** | Principal Secretary | 55, political appointee, reads briefings on iPad, non-technical | Low-Medium. Uses email, PowerPoint, rarely logs into systems. | Ministry office, air-conditioned, reliable power, needs answers in 30 seconds | Time-poor, needs confidence to brief Cabinet, skeptical of technology promises |

### 1.3 The Golden Rules

**Rule 1: The Thumb Rules Everything**
- 80% of CHW interactions must be reachable with one thumb (right or left)
- No critical action button smaller than 56×56dp (Android) or 60×60px (web)
- Bottom navigation only. Top navigation is for dashboards used while sitting at a desk.

**Rule 2: Text is a Last Resort**
- If you can show it with an icon, illustration, or color, do not use text
- If you must use text, use Chichewa first, English second
- If you must use English, use simple words (Grade 4 reading level)
- Maximum 12 words per screen for CHW app

**Rule 3: Red Means Danger, Not Brand**
- Red = emergency, danger, stop, critical risk
- Yellow = warning, caution, medium risk
- Green = safe, complete, low risk
- Blue = action, information, tap here
- Never use red for branding, notifications, or "new feature" badges

**Rule 4: Offline is the Default State**
- Every screen must have a clear offline indicator (not a sad error message)
- "You are working offline. Your data is safe. Sync when you have signal." — not "Connection failed."
- Sync progress must be visual and celebratory (not a spinning wheel of death)

**Rule 5: The CHW is the Expert, Not the App**
- AI recommendations are labeled "Suggestion" not "Decision"
- Override is always one tap away, never buried in menus
- When CHW overrides AI, the app says "Thank you. Your experience helps us learn." not "Are you sure?"

---

## 2. COLOR SYSTEM: "MAWUNO A ZISAMALE"

### 2.1 Primary Palette

| Token | Hex | RGB | Usage | Malawi Context |
|-------|-----|-----|-------|---------------|
| **Zisamale Green** | `#2D7D46` | 45, 125, 70 | Primary brand, success, safe status, "go" actions | The color of maize fields, growth, health. Culturally positive. |
| **Zisamale Teal** | `#0F7B8A` | 15, 123, 138 | Secondary brand, information, links, active states | Clean water, trust, calm. Used for non-urgent actions. |
| **Zisamale Dark** | `#1A1A2E` | 26, 26, 46 | Text, headers, high-emphasis surfaces | Deep night sky. Maximum contrast for readability. |
| **Zisamale Light** | `#F5F5F0` | 245, 245, 240 | Backgrounds, cards, surfaces | Warm white — not sterile hospital white. Earthy, approachable. |

### 2.2 Semantic Colors (Risk & Action)

| Token | Hex | Usage | Accessibility |
|-------|-----|-------|--------------|
| **Critical Red** | `#C62828` | Critical risk, emergency referral, danger signs, stop | WCAG AAA on white. Visible in bright sun. |
| **High Risk Orange** | `#E65100` | High risk, urgent action, overdue tasks | WCAG AA on white. Distinct from red for colorblind users (protanopia). |
| **Medium Risk Amber** | `#F9A825` | Medium risk, warning, attention needed | WCAG AA on dark backgrounds only. Never on white (insufficient contrast). |
| **Low Risk Green** | `#2E7D32` | Low risk, completed, on track | WCAG AAA on white. |
| **Info Blue** | `#1565C0` | Information, help, learn more, tap to expand | WCAG AA on white. |
| **Neutral Gray** | `#616161` | Disabled states, secondary text, borders | WCAG AA on white. |

### 2.3 Color Accessibility Rules

**For Colorblind Safety (8% of male population):**
- Risk levels must NEVER rely on color alone. Always pair with: icon shape + text label + pattern/texture
- Critical: Red + skull icon + "YAMBIKANI" (Emergency) + solid fill
- High: Orange + exclamation triangle + "CHANGU" (Urgent) + diagonal stripes
- Medium: Amber + circle with dot + "CHIDULE" (Caution) + dotted pattern
- Low: Green + checkmark + "BWINO" (Good) + no pattern

**For Bright Sunlight:**
- All text on colored backgrounds must have contrast ratio ≥ 4.5:1
- Avoid light gray text (#999) on white — invisible in sun
- Use dark text (#1A1A2E) on light backgrounds exclusively
- Cards must have subtle shadows (elevation 2-4dp) to create depth in glare

**For Dark Mode (Dashboards only):**
- Background: `#121212`
- Surface: `#1E1E1E`
- Primary text: `#E0E0E0`
- Secondary text: `#A0A0A0`
- Semantic colors remain identical (red is still red)

### 2.4 Cultural Color Avoidance

- **Black:** Do not use pure black (#000000) for backgrounds or text. In Malawi, black is associated with mourning and death. Use Zisamale Dark (#1A1A2E) instead.
- **Purple:** Avoid for primary actions. Associated with witchcraft in some Malawian communities.
- **White alone:** Do not use white backgrounds for "clean" look. Use Zisamale Light (#F5F5F0) for warmth.

---

## 3. TYPOGRAPHY: "MAWERU"

### 3.1 Font Stack

**Android (CHW App):**
- Primary: `Roboto` (system font, optimized for low-resolution screens)
- Fallback: `Noto Sans` (supports Chichewa extended Latin characters: ŵ, ŋ, etc.)
- Monospace: `Roboto Mono` (for referral codes, IDs only)

**Web (Dashboards):**
- Primary: `Inter` (excellent screen readability, open source)
- Fallback: `system-ui, -apple-system, sans-serif`
- Display/Headlines: `Inter` Bold (never decorative fonts for data)

**Chichewa Text Rendering:**
- Must support extended Latin: â, ê, î, ô, û, ŵ, ŋ, á, é, í, ó, ú, ẃ, ń
- Test with: "Mwayi wabwino" (Good opportunity), "ŵanthu" (people), "ŋ'ombe" (cattle)
- Font files must include these glyphs or fallback gracefully (no tofu boxes)

### 3.2 Type Scale (CHW App — Mobile)

| Token | Size | Weight | Line Height | Usage | Max Characters per Line |
|-------|------|--------|-------------|-------|------------------------|
| **Display** | 32sp | Bold (700) | 1.2 | App title, welcome screen | 15 |
| **Headline** | 24sp | Bold (700) | 1.3 | Screen titles, patient names | 20 |
| **Title** | 20sp | SemiBold (600) | 1.4 | Card titles, section headers | 25 |
| **Body Large** | 18sp | Regular (400) | 1.5 | Primary text, form labels | 30 |
| **Body** | 16sp | Regular (400) | 1.5 | Default text, descriptions | 35 |
| **Caption** | 14sp | Medium (500) | 1.4 | Labels, hints, metadata | 40 |
| **Tiny** | 12sp | Medium (500) | 1.3 | Timestamps, version numbers | 50 |

**Rules:**
- Minimum text size: 14sp (anything smaller is unreadable in sunlight)
- Patient names: Always 20sp Bold (must be readable from arm's length)
- Risk scores: 32sp Bold (largest text on screen — this is the critical information)
- Buttons: 16sp SemiBold (must be readable while walking)

### 3.3 Type Scale (Dashboards — Desktop/Tablet)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| **H1** | 32px | Bold | Page titles |
| **H2** | 24px | SemiBold | Section headers |
| **H3** | 20px | SemiBold | Card titles |
| **Body** | 16px | Regular | Tables, descriptions |
| **Caption** | 14px | Medium | Column headers, metadata |
| **Data** | 28px | Bold | KPI numbers, risk scores |
| **Label** | 12px | Medium | Axis labels, timestamps |

### 3.4 Text Styling Rules

**For Low Literacy Support:**
- Use sentence case, not Title Case (easier to read): "Visit patient" not "Visit Patient"
- Use active voice: "Tap to refer" not "Referral may be initiated"
- Use present tense: "The patient needs help" not "The patient will have needed help"
- One idea per sentence. Maximum 12 words per sentence for CHW-facing text.
- Numbers as digits: "3 patients" not "three patients"

**For Bilingual Support (Chichewa + English):**
- Primary language: Chichewa (larger, darker)
- Secondary language: English (smaller, lighter gray, below or beside)
- Format:
  ```
  Mwana ali pa chiopsezo
  Child is in danger
  ```
- Never mix languages in the same sentence
- Allow user to toggle primary language in Settings (default: Chichewa)

---

## 4. LAYOUT & SPACING: "MALO"

### 4.1 Grid System (CHW App)

- **Base unit:** 8dp (everything divisible by 8)
- **Screen margins:** 16dp horizontal, 12dp vertical
- **Card padding:** 16dp internal, 12dp between cards
- **Touch targets:** Minimum 56×56dp (Android accessibility standard)
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64dp

### 4.2 Thumb Zones (Critical for One-Handed Use)

```
┌─────────────────────────────┐
│  REACHABLE WITH THUMB       │  ← Top 20%: Info only, no actions
│  (stretch)                  │
├─────────────────────────────┤
│                             │
│  EASY REACH                 │  ← Middle 60%: Primary content,
│  (one-handed)               │     scrollable lists
│                             │
├─────────────────────────────┤
│  NATURAL THUMB REST         │  ← Bottom 20%: ALL actions,
│  (no stretch)               │     navigation, primary buttons
└─────────────────────────────┘
```

**Rules:**
- Primary action button: Bottom-right corner (natural for right-handed users; 85% of population)
- Secondary action: Bottom-left corner
- Navigation: Bottom tab bar only (never hamburger menu for primary nav)
- Back button: Bottom-left or swipe gesture (never top-left for CHW app)
- Floating Action Button (FAB): Bottom-right, 56dp, elevated 6dp

### 4.3 Card Design (Primary Content Container)

```
┌─────────────────────────────────────┐  ← 16dp radius corners
│  ┌────┐  Patient Name (20sp Bold)  │  ← 16dp internal padding
│  │ 👤 │  Risk: HIGH (16sp)          │  ← Icon + text layout
│  └────┘  ━━━━━━━━━━━━━━━            │  ← Divider line
│  📍 2.3 km to facility              │  ← Metadata row with icon
│  📅 Last visit: 3 days ago          │
│  ┌─────────────────────────────┐    │
│  │    VISIT NOW (56dp height)  │    │  ← Full-width primary action
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
     ↑ 12dp gap to next card
```

**Card specs:**
- Background: `#FFFFFF` (on Zisamale Light `#F5F5F0` screen)
- Border radius: 16dp (friendly, approachable)
- Elevation: 2dp default, 4dp on press, 8dp for critical cards
- Border: 1dp `#E0E0E0` (subtle definition without harsh lines)
- Critical cards (emergency referral): 2dp border in Critical Red

### 4.4 Dashboard Layout (Desktop/Tablet)

- **Max content width:** 1400px (centered, not full-bleed on ultrawide)
- **Sidebar:** 280px fixed, collapsible to 64px icon-only
- **Card grid:** CSS Grid, auto-fill minmax(320px, 1fr)
- **Data density:** Max 7 columns in table view (cognitive limit)
- **Whitespace:** 24px between sections, 16px between cards

---

## 5. COMPONENTS: "ZINTHU"

### 5.1 Buttons

**Primary Button (The "Do It" Button)**
- Background: Zisamale Green `#2D7D46`
- Text: White, 16sp SemiBold
- Height: 56dp minimum
- Border radius: 12dp
- Icon: Left-aligned, 24dp, white
- Press state: Darken to `#1B5E20`, scale to 0.98
- Disabled: Background `#BDBDBD`, text `#757575`
- Loading: Replace text with circular progress (same color)

**Secondary Button (The "Maybe" Button)**
- Background: Transparent
- Border: 2dp Zisamale Teal `#0F7B8A`
- Text: Zisamale Teal, 16sp SemiBold
- Height: 48dp
- Press state: Fill with `#0F7B8A` at 10% opacity

**Danger Button (The "Stop" Button)**
- Background: Critical Red `#C62828`
- Text: White, 16sp SemiBold
- Height: 56dp
- Icon: Warning triangle, left-aligned
- Only for: Emergency referrals, data deletion, logout

**Floating Action Button (FAB)**
- Size: 56dp
- Background: Zisamale Green
- Icon: White, 24dp
- Elevation: 6dp default, 12dp pressed
- Position: Bottom-right, 16dp from edges
- Usage: Single primary action per screen (e.g., "New Visit")

### 5.2 Forms & Inputs

**Text Input (Minimize These)**
- Background: `#FFFFFF`
- Border: 1dp `#BDBDBD`, radius 8dp
- Focus: Border 2dp Zisamale Teal, elevation 2dp
- Error: Border 2dp Critical Red, helper text in red
- Height: 56dp minimum
- Label: Above input, 14sp Medium, Zisamale Dark
- Helper text: Below input, 12sp, Neutral Gray
- **Prefer:** Steppers, sliders, and radio buttons over free text

**Stepper (For Numbers)**
- Use for: BP readings, weight, age, parity
- Layout: [-] [  120  ] [+] 
- Buttons: 48×48dp, Zisamale Teal background
- Value: 20sp Bold, centered
- Long-press: Accelerate increment (for large ranges)

**Radio Button Group (For Choices)**
- Use for: Yes/No questions, symptom selection, danger signs
- Layout: Vertical stack, full-width cards
- Selected: 2dp Zisamale Green border, light green background `#E8F5E9`
- Unselected: 1dp `#E0E0E0` border, white background
- Icon: Left-aligned illustration (not just text)

**Checkbox (For Multi-Select)**
- Use for: Danger signs (can select multiple)
- Size: 40×40dp touch target (larger than Material default)
- Checked: Zisamale Green fill, white checkmark
- Label: 16sp, to the right of checkbox

**Voice Input (Preferred Over Typing)**
- Microphone button: 56dp circular, Zisamale Teal
- Recording state: Pulsing red ring, "Kuyankhula..." (Speaking...)
- Transcription: Appears as text below, editable before save
- Offline: Uses Whisper Tiny (39MB) on-device for Chichewa/English

### 5.3 Risk Score Display (The Most Important Component)

**Full Risk Card (For Patient Profile)**
```
┌─────────────────────────────────────┐
│  RISK SCORE                         │  ← 12sp Caption
│  ┌──────┐                           │
│  │  8   │  HIGH RISK                │  ← 48sp score, 20sp label
│  │ /10  │  ━━━━━━━━━━               │  ← Progress bar fills 80%
│  └──────┘                           │
│  ⚠️ Main reasons:                   │  ← 14sp Caption
│  • BP 150/95 (high blood pressure)  │  ← 16sp Body
│  • 3rd pregnancy, no ANC visits     │
│  • 12 km from facility              │
│                                     │
│  [REFER IMMEDIATELY]                │  ← 56dp Danger Button
└─────────────────────────────────────┘
```

**Compact Risk Badge (For List Views)**
- Size: 48×48dp circle
- Background: Risk color (Critical Red, High Orange, Medium Amber, Low Green)
- Text: Score number, 20sp Bold, white
- Border: 3dp white (for visibility on colored cards)
- Position: Right side of patient card

**Risk Color Rules:**
- 1–3: Low Green `#2E7D32`
- 4–6: Medium Amber `#F9A825` (dark text `#1A1A2E` for contrast)
- 7–8: High Orange `#E65100`
- 9–10: Critical Red `#C62828`

### 5.4 Alert Components

**CHW App Alert (In-App Notification)**
- Position: Top of screen, full-width
- Background: Risk color at 90% opacity
- Text: White, 16sp SemiBold
- Icon: Left-aligned, 24dp
- Action: Swipe to dismiss, or tap to navigate
- Duration: Persistent until acknowledged (not auto-dismiss)
- Haptic: Short vibration on display

**DHO Dashboard Alert Card**
```
┌─────────────────────────────────────┐
│  🔴 MALARIA OUTBREAK PREDICTED      │  ← Disease icon + title
│  Nsanje District, TA Ndamera        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  Predicted: 450 cases in 2 weeks    │  ← 16sp data
│  Confidence: 85%                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  [ACKNOWLEDGE]  [DEPLOY DRRT]       │  ← Two buttons
│  [REQUEST SUPPLIES]                 │
└─────────────────────────────────────┘
```

**Alert Acknowledgement Flow:**
1. Alert appears (red border, pulsing if unacknowledged >1 hour)
2. User taps "Acknowledge" → timestamp logged → border turns solid
3. User selects action → form pre-filled → confirmation dialog
4. If no action in 4 hours → escalate to supervisor via SMS

### 5.5 Maps (DHO & MoHP Dashboards)

**Base Map:**
- Provider: Mapbox Satellite + OpenStreetMap hybrid
- Style: Minimal labels, high contrast roads, muted natural colors
- Offline: Pre-cache district tiles to 50MB per district

**Risk Heatmap Layer:**
- Color scale: Green (low) → Yellow (medium) → Orange (high) → Red (critical)
- Opacity: 0.6 (must see roads underneath)
- Boundary: 2dp white stroke on TA boundaries
- Interaction: Click TA → popup with summary stats + action buttons

**Facility Layer:**
- Icon: Hospital building, 24px
- Color: Green (fully stocked), Amber (some stockouts), Red (critical stockouts), Gray (unknown)
- Size: Proportional to catchment population
- Interaction: Click → facility card with real-time stock levels

**CHW Layer:**
- Icon: Person with bag, 20px
- Color: Green (active today), Amber (active this week), Red (not synced >48hrs), Gray (inactive)
- Clustering: Group nearby CHWs at low zoom levels

### 5.6 Charts & Data Visualization

**Time Series (Surveillance Trends)**
- Library: Recharts (web), MPAndroidChart (Android)
- Actual data: Solid line, Zisamale Dark, 2px stroke
- Predicted data: Dashed line, Zisamale Teal, 2px stroke
- Confidence band: Zisamale Teal at 20% opacity
- Annotations: Red vertical line for alert thresholds
- Y-axis: Start at 0 (never truncate — misleading)
- Tooltips: Show exact value + date on hover/tap

**Bar Charts (Stock Levels)**
- Current stock: Solid fill, Zisamale Green
- Recommended minimum: Dashed horizontal line, Critical Red
- Predicted depletion date: Arrow annotation
- Color coding: Green (>2 weeks supply), Amber (1-2 weeks), Red (<1 week)

**Pie/Donut Charts (Avoid)**
- **Do not use pie charts.** Humans are bad at comparing angles.
- Use horizontal bar charts instead for proportions.

**KPI Cards (MoHP Dashboard)**
```
┌─────────────────┐
│  MATERNAL       │  ← 12sp Caption
│  MORTALITY      │
│                 │
│  412            │  ← 32sp Bold (the number)
│  per 100,000    │  ← 14sp
│                 │
│  ↓ 6% vs Q2     │  ← 14sp Green (improvement)
└─────────────────┘
```

### 5.7 Progress & Loading States

**Sync Progress (CHW App)**
- Visual: Circular progress with percentage + icon count ("45 of 120 items")
- Text: "Kusunga zinthu..." (Saving things...) / "Zasungidwa!" (Saved!)
- Success: Green checkmark animation + haptic feedback
- Failure: Red X + "Vuto linaliko. Tiyeserenso." (There was a problem. Let's try again.) + "Try Now" button
- Background sync: Small cloud icon in status bar, no blocking UI

**Dashboard Loading**
- Skeleton screens (gray pulse) matching card shapes
- Never show blank white screens
- Staggered loading: Cards appear as data arrives, not all at once
- Error: "Data could not load. [Retry]" — not technical error codes

---

## 6. MOTION & ANIMATION: "KUYENDA"

### 6.1 Principles

- **Purposeful:** Every animation communicates state change or guides attention
- **Fast:** 150-300ms duration. CHWs do not have time to wait.
- **Subtle:** No bouncing, no spinning, no parallax. This is a medical tool, not a game.
- **Battery-conscious:** No continuous animations. No animated backgrounds.

### 6.2 Standard Transitions

| Transition | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Screen enter | 200ms | ease-out | Navigate to new screen |
| Screen exit | 150ms | ease-in | Go back |
| Card press | 100ms | ease-in-out | Button tap feedback |
| Card release | 150ms | ease-out | Button release |
| Modal slide-up | 250ms | cubic-bezier(0.4, 0, 0.2, 1) | Form bottom sheet |
| Modal dismiss | 200ms | ease-in | Close bottom sheet |
| List item add | 300ms | ease-out | New alert appears |
| List item remove | 200ms | ease-in | Alert dismissed |
| Progress fill | 500ms | linear | Sync progress |
| Success check | 400ms | ease-out | Task completed |

### 6.3 Micro-Interactions

**Button Press:**
- Scale to 0.96
- Elevation reduces by 2dp
- Background darkens 10%
- Haptic: Light tick (if device supports)

**Risk Score Update:**
- Number counts up/down with 300ms duration
- Color transitions smoothly (not instant jump)
- If score crosses threshold (e.g., 6→7), card border pulses once

**Alert Arrival:**
- Slide down from top with 250ms
- Subtle pulse every 3 seconds if unacknowledged
- Haptic: Double tap for critical alerts

**Sync Complete:**
- Cloud icon morphs into checkmark
- Brief green flash on status bar
- Haptic: Success pattern (light-medium-light)

### 6.4 Accessibility & Motion

- Respect `prefers-reduced-motion` on dashboards
- CHW app: No setting needed — all animations are already subtle and brief
- Never use flashing animations (>3 flashes per second — seizure risk)

---

## 7. VOICE & TONE: "MAWU"

### 7.1 CHW App Voice

**Personality:** A respectful, experienced colleague. Not a boss. Not a robot.

**Do:**
- "Mwayi wabwino! Mwana wanu akufunika kupita ku chipatala changu." (Good news! Your child needs to go to the hospital quickly.)
- "Zikomo chifukwa cha kudziwitsa." (Thank you for letting us know.)
- "Mukuwona bwanji lero?" (How are you seeing [the patient] today?)
- "Pepani, pali vuto. Tiyeserenso." (Sorry, there is a problem. Let's try again.)

**Don't:**
- "Error 404: Patient not found" (technical jargon)
- "You have violated protocol." (punitive)
- "The algorithm has determined..." (robotic)
- "Are you sure you want to override the AI recommendation?" (distrustful)

**Override Flow Copy:**
```
Before: "Are you sure? The AI recommends referral."
After:  "Mukufuna kusintha? Zikomo — kudziwa kwanu ndikofunika."
        (You want to change? Thank you — your knowledge is important.)

        [Reason for override — optional]
        ○ Patient refused
        ○ I know this family
        ○ Symptoms changed
        ○ Other: ________

        [CONFIRM CHANGE]
```

### 7.2 Dashboard Voice

**DHO Dashboard:** Professional, urgent when needed, data-driven.
- "Outbreak predicted in TA Ndamera. 85% confidence. 2-week horizon."
- "3 CHWs have not synced in >48 hours. Supervisor notified."
- "Stockout imminent: ACT at Nsanje District Hospital (10 days remaining)."

**MoHP Dashboard:** Executive, concise, actionable.
- "3 districts at high risk this week. Nsanje requires emergency resupply."
- "Maternal mortality down 12% in Neno since AI deployment."
- "Recommended: Reallocate 50M MWK to southern region malaria response."

### 7.3 Error Messages

**Template:**
1. What happened (human terms)
2. Why it matters (consequence)
3. What to do (clear action)

**Examples:**
```
❌ "Connection timeout: ERR_CONNECTION_REFUSED"
✅ "Sitinathe kusunga. Foni yanuyo ili pa intaneti?"
   (We couldn't save. Is your phone on the internet?)
   [Try Again] [Save Offline]

❌ "Invalid input: hemoglobin must be numeric"
✅ "Chonde lembani nambala yokha. Chitsanzo: 11.5"
   (Please write numbers only. Example: 11.5)

❌ "403 Forbidden"
✅ "Simungathe kuona mauthenga awa. Funsani bwanji wanu."
   (You cannot see these messages. Ask your supervisor.)
```

---

## 8. ACCESSIBILITY: "KUTHANDIZA ONSE"

### 8.1 WCAG 2.1 AA Compliance (Minimum)

**Visual:**
- Contrast ratio ≥ 4.5:1 for all text
- Contrast ratio ≥ 3:1 for UI components and graphical objects
- Text resize up to 200% without loss of content
- No information conveyed by color alone

**Motor:**
- All interactive elements ≥ 56×56dp touch target
- Gesture alternatives (tap instead of swipe where possible)
- No time limits on tasks (or extendable to 10x)

**Cognitive:**
- Consistent navigation across all screens
- Clear error prevention (confirm before destructive actions)
- Context-sensitive help available on every screen

**Screen Readers (TalkBack/VoiceOver):**
- All images have descriptive alt text
- All buttons have clear labels
- Focus order follows visual order
- No focus traps

### 8.2 CHW-Specific Accessibility

**Low Literacy Support:**
- Icons must be universally understood (test with non-literate CHWs)
- Audio narration option for all instructions (tap speaker icon to hear)
- Video tutorials embedded in app (compressed to 5MB, offline-available)
- Picture-based forms where possible (e.g., body diagram for marking pain location)

**Low Vision Support:**
- High contrast mode toggle (increases contrast to 7:1)
- Large text mode (increases all text by 25%)
- Screen magnification gesture (triple-tap to zoom)

**Motor Impairment Support:**
- Voice control for all actions ("Tap to visit patient number 3")
- Extended touch duration (adjustable in settings)

### 8.3 Dashboard Accessibility

- Keyboard navigation for all functions (Tab, Enter, Escape)
- Screen reader optimized tables (proper `<th>` scope, captions)
- Chart alternatives: Data tables + text summaries for all visualizations
- Focus indicators: 2px Zisamale Teal outline on focused elements

---

## 9. ONBOARDING & TRAINING: "KUPHUNZIRA"

### 9.1 CHW App Onboarding (First Launch)

**Duration:** Maximum 5 minutes. CHWs are paid per visit, not per minute of training.

**Flow:**
1. **Welcome:** "Takulandirani ku Zisamale!" (Welcome to Zisamale!) + illustration of CHW helping family
2. **Permission:** Request location, camera, microphone — one at a time, with explanation why
3. **Language:** "Mukufuna kuyankhula chiyani?" (What language do you want to speak?) — Chichewa / English toggle
4. **PIN Setup:** "Sankhani nambala zanu zachinsinsi" (Choose your secret numbers) — 6-digit PIN
5. **Quick Tour (3 screens):**
   - "Here are your patients for today" (shows dashboard)
   - "Tap a patient to visit them" (shows visit form)
   - "Tap here when you are done" (shows sync button)
6. **Done:** "Ndi bwino! Mukuwoneka ngati mukudziwa." (Good! You look like you know.) + "Start Working" button

**Skip option:** "Mukudziwa kale?" (Already know?) — skip to app

### 9.2 Contextual Help (Ongoing)

**Help Button:** Floating question mark icon, 40dp, bottom-left corner
- Tap → bottom sheet with:
  - "How do I...?" (common tasks)
  - "What does this mean?" (glossary)
  - "Call supervisor" (one-tap dial)
  - "Watch video" (30-second tutorial)

**First-Time User Tips:**
- Show tooltip on first use of each feature
- "Tap here to see this patient's risk" (arrow pointing to risk badge)
- Maximum 3 tips per session
- Dismissible: "Sindifuna kuwonanso" (I don't want to see again)

### 9.3 Dashboard Onboarding

**DHO Dashboard:**
- Interactive walkthrough (Shepherd.js or similar)
- "This is your alert inbox. When Zisamale predicts an outbreak, it appears here."
- "Click this button to acknowledge the alert and tell your team you are responding."
- "This map shows risk levels across your district. Red means act now."

**MoHP Dashboard:**
- 2-minute video briefing (embedded)
- "This is your weekly executive summary. It is generated automatically every Monday."
- "Click here to download the PDF for Cabinet."
- "This slider lets you model budget scenarios. Try it."

---

## 10. ILLUSTRATION & ICONOGRAPHY: "ZITHUNZI"

### 10.1 Icon Style

- **Style:** Line icons, 2px stroke, rounded caps, minimal detail
- **Size:** 24dp default, 48dp for touch targets
- **Color:** Zisamale Dark default; risk color for semantic icons
- **Library:** Phosphor Icons (open source, consistent, supports Chichewa localization)
- **Custom icons needed:**
  - Pregnant woman (side view, not front — modest)
  - Child with MUAC tape
  - CHW with bag (female and male versions)
  - Traditional Authority boundary
  - Mosquito (for malaria)
  - Water pump (for cholera risk)
  - Syringe (for vaccination)

### 10.2 Illustration Style

- **Style:** Flat, friendly, diverse skin tones (Malawian range — not generic "brown")
- **People:** Always shown with dignity. No suffering children. No starving mothers. Show care, competence, and community.
- **Scenes:** Rural Malawi — thatched roofs, maize fields, baobab trees, community under tree
- **Gender balance:** Equal representation of male and female CHWs, clinicians, and patients
- **Age diversity:** Show elderly, adults, children, infants

**Usage:**
- Empty states: "No patients today" → illustration of CHW resting under tree
- Success states: "Referral complete" → illustration of patient arriving at hospital
- Error states: "Sync failed" → illustration of CHW looking at phone with question mark
- Onboarding: Step-by-step scenes showing CHW using app

### 10.3 Photography Guidelines

- **CHW photos:** Consent required, stored encrypted, never used in marketing without explicit permission
- **Patient photos:** Never shown in dashboards. Only CHW can see their own patients.
- **Stock photos:** Avoid generic African stock photography. Use real Malawi imagery only.

---

## 11. EMPTY STATES & EDGE CASES

### 11.1 Empty States

**No Patients Today:**
```
┌─────────────────────────────────────┐
│                                     │
│     [Illustration: CHW under tree]  │
│                                     │
│  Lero mulibe alendo                 │  ← 20sp Bold
│  (No visits today)                  │  ← 16sp Body
│                                     │
│  Mukuwoneka bwino!                  │  ← 14sp Caption
│  (You look good!)                   │
│                                     │
│  [GO HOME AND REST]                 │  ← Secondary button
│                                     │
└─────────────────────────────────────┘
```

**No Internet Connection:**
```
┌─────────────────────────────────────┐
│     [Illustration: Phone + cloud    │
│      with X, but happy CHW]         │
│                                     │
│  Muli pa intaneti                   │
│  (You are offline)                  │
│                                     │
│  Zinthu zanu zili bwino.            │
│  (Your things are safe.)            │
│                                     │
│  Mukuwoneka ngati mukudziwa.        │
│  (You look like you know.)          │
│                                     │
│  [CONTINUE WORKING]                 │
│  [SYNC WHEN READY]                  │
└─────────────────────────────────────┘
```

**Sync Failed:**
```
┌─────────────────────────────────────┐
│     [Illustration: CHW + retry      │
│      arrow, supportive supervisor]  │
│                                     │
│  Sitinathe kusunga                  │
│  (We couldn't save)                 │
│                                     │
│  Musaname. Zinthu zanu zili         │
│  pafoni yanu.                       │
│  (Don't worry. Your things are      │
│   on your phone.)                   │
│                                     │
│  [TRY AGAIN]  [CALL SUPERVISOR]     │
└─────────────────────────────────────┘
```

### 11.2 Error States

**Form Validation Error:**
- Field border turns Critical Red
- Error message appears below field in red
- Error message explains *how* to fix, not just *what* is wrong
- Example: "BP must be between 60 and 250" not "Invalid input"

**Server Error (Dashboard):**
- "We cannot reach the server. Your data is safe."
- "Last updated: 2 hours ago"
- "[Retry]" button
- "If this continues, call: +265 XX XXX XXXX"

**Model Prediction Failure:**
- "Zisamale could not calculate a risk score for this patient."
- "Please use your clinical judgment."
- "[Report Problem]" (logs to ML team)
- Never show raw error codes to CHWs

---

## 12. DESIGN TOKENS

### 12.1 Token Structure

```json
{
  "color": {
    "brand": {
      "green": "#2D7D46",
      "teal": "#0F7B8A",
      "dark": "#1A1A2E",
      "light": "#F5F5F0"
    },
    "semantic": {
      "critical": "#C62828",
      "high": "#E65100",
      "medium": "#F9A825",
      "low": "#2E7D32",
      "info": "#1565C0",
      "neutral": "#616161"
    },
    "surface": {
      "background": "#F5F5F0",
      "card": "#FFFFFF",
      "elevated": "#FFFFFF"
    }
  },
  "spacing": {
    "xs": "4dp",
    "sm": "8dp",
    "md": "16dp",
    "lg": "24dp",
    "xl": "32dp",
    "xxl": "48dp"
  },
  "radius": {
    "sm": "8dp",
    "md": "12dp",
    "lg": "16dp",
    "full": "9999dp"
  },
  "elevation": {
    "none": "0dp",
    "low": "2dp",
    "medium": "4dp",
    "high": "8dp"
  },
  "typography": {
    "family": {
      "primary": "Roboto",
      "fallback": "Noto Sans"
    },
    "size": {
      "tiny": "12sp",
      "caption": "14sp",
      "body": "16sp",
      "bodyLarge": "18sp",
      "title": "20sp",
      "headline": "24sp",
      "display": "32sp"
    }
  }
}
```

### 12.2 Theme Implementation

**Android (Jetpack Compose):**
```kotlin
@Composable
fun ZisamaleTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF2D7D46),
            secondary = Color(0xFF0F7B8A),
            background = Color(0xFFF5F5F0),
            surface = Color(0xFFFFFFFF),
            error = Color(0xFFC62828),
            onPrimary = Color(0xFFFFFFFF),
            onSecondary = Color(0xFFFFFFFF),
            onBackground = Color(0xFF1A1A2E),
            onSurface = Color(0xFF1A1A2E),
            onError = Color(0xFFFFFFFF)
        ),
        typography = ZisamaleTypography,
        shapes = Shapes(
            small = RoundedCornerShape(8.dp),
            medium = RoundedCornerShape(12.dp),
            large = RoundedCornerShape(16.dp)
        ),
        content = content
    )
}
```

**Web (Tailwind CSS):**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        zisamale: {
          green: '#2D7D46',
          teal: '#0F7B8A',
          dark: '#1A1A2E',
          light: '#F5F5F0',
        },
        risk: {
          critical: '#C62828',
          high: '#E65100',
          medium: '#F9A825',
          low: '#2E7D32',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    }
  }
}
```

---

## 13. SCREEN-SPECIFIC DESIGN PATTERNS

### 13.1 CHW App: Daily Dashboard

**Layout:**
```
┌─────────────────────────────────────┐
│  ☰  Zisamale        🔔3  ☁️✓      │  ← Header: Menu, brand, alerts, sync status
├─────────────────────────────────────┤
│  Mawa, 21 August 2027               │  ← Date, 16sp
│  Mwayi wabwino, Grace!              │  ← Greeting with CHW name, 20sp
├─────────────────────────────────────┤
│  TODAY'S VISITS          [FILTER ▼] │  ← Section header + filter
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 👤 Mary Banda      [🔴 9]   │    │  ← Patient card
│  │ 🤰 8 months pregnant        │    │
│  │ 📍 1.2 km | ⏰ Overdue 2d   │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │    │
│  │    [VISIT NOW]              │    │  ← Full-width primary button
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 👶 Chisomo Moyo    [🟡 5]   │    │
│  │ 👶 18 months | MUAC: 11.5   │    │
│  │ 📍 3.4 km | ⏰ Due today     │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │    │
│  │    [VISIT NOW]              │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 👤 Ethel Kumwenda  [🟢 3]   │    │
│  │ 🤰 5 months | Routine check  │    │
│  │ 📍 0.8 km | ⏰ Due in 3 days │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │    │
│  │    [VISIT NOW]              │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [➕ NEW VISIT]  [📊 MY STATS]      │  ← Bottom actions
└─────────────────────────────────────┘
```

### 13.2 CHW App: Visit Form

**Layout:**
```
┌─────────────────────────────────────┐
│  ←  Mary Banda        [💾 SAVE]     │  ← Back, name, save
├─────────────────────────────────────┤
│  🔴 HIGH RISK — 8/10                │  ← Risk banner (if applicable)
│  ⚠️ BP high, No ANC visits          │
├─────────────────────────────────────┤
│  VITAL SIGNS                        │  ← Section (collapsible)
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  Blood Pressure                     │
│  [ 120 ] / [ 80 ] mmHg              │  ← Stepper inputs
│                                     │
│  Weight                             │
│  [  65  ] kg                        │
│                                     │
│  Hemoglobin                         │
│  [ 11.5 ] g/dL                      │
├─────────────────────────────────────┤
│  DANGER SIGNS                       │  ← Section
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  ☐ Severe headache                  │  ← Large checkboxes
│  ☐ Blurred vision                   │
│  ☐ Bleeding                         │
│  ☐ Severe abdominal pain            │
│  ☐ Fever >38°C                      │
│  ☐ Reduced fetal movement           │
├─────────────────────────────────────┤
│  AI SUGGESTION                      │  ← AI recommendation card
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  "Refer to hospital immediately     │
│   for high blood pressure."         │
│                                     │
│  [I AGREE]  [I DISAGREE — WHY?]     │  ← Two clear actions
├─────────────────────────────────────┤
│  NOTES                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  🎤 [Tap to speak]                  │  ← Voice input primary
│  or type below...                   │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [✓ COMPLETE VISIT]                 │  ← 56dp primary button
└─────────────────────────────────────┘
```

### 13.3 DHO Dashboard: Alert Command Center

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ZISAMALE        Nsanje District    🔔 3 alerts    👤 Dr. Chirwa│
├──────────────────┬──────────────────────────────────────────────┤
│  📊 Overview     │  ALERTS (3 unacknowledged)                  │
│  🗺️ Risk Map      │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  👥 CHWs         │  ┌─────────────────────────────────────┐   │
│  📈 Trends       │  │ 🔴 MALARIA OUTBREAK                 │   │
│  ⚙️ Settings     │  │ TA Ndamera | Predicted: 450 cases   │   │
│                  │  │ Confidence: 85% | In 2 weeks        │   │
│                  │  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│                  │  │ [ACKNOWLEDGE] [DEPLOY DRRT]         │   │
│                  │  │ [REQUEST SUPPLIES]                  │   │
│                  │  └─────────────────────────────────────┘   │
│                  │  ┌─────────────────────────────────────┐   │
│                  │  │ 🟡 CHOLERA RISK                     │   │
│                  │  │ TA Mbenje | Predicted: 120 cases    │   │
│                  │  │ Confidence: 72% | In 4 weeks        │   │
│                  │  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│                  │  │ [ACKNOWLEDGE] [PRE-POSITION ORS]    │   │
│                  │  └─────────────────────────────────────┘   │
│                  │                                              │
│                  │  RECENTLY ACKNOWLEDGED                     │
│                  │  ┌─────────────────────────────────────┐   │
│                  │  │ 🟢 MEASLES CLUSTER — Resolved       │   │
│                  │  │ TA Chimombo | Vaccination deployed  │   │
│                  │  │ Acknowledged by you 2 hours ago     │   │
│                  │  └─────────────────────────────────────┘   │
└──────────────────┴──────────────────────────────────────────────┘
```

### 13.4 MoHP Dashboard: Executive Scorecard

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ZISAMALE — MINISTRY OF HEALTH    Week 34, 2027    [📄 PDF]   │
├─────────────────────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  "3 districts predicted to experience malaria outbreaks in      │
│   the next 2 weeks. Nsanje requires emergency ACT resupply.     │
│   Maternal mortality in Neno decreased 12% since deployment."   │
│                                                                 │
│  [📊 VIEW DETAILS]  [💰 MODEL BUDGET SCENARIO]                  │
├─────────────────────────────────────────────────────────────────┤
│  DISTRICT HEALTH SCORECARD                    [Filter ▼]        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Nsanje     │ │ Neno       │ │ Blantyre   │ │ Mzuzu      │   │
│  │ 🔴 HIGH    │ │ 🟡 MEDIUM  │ │ 🟢 LOW     │ │ 🟢 LOW     │   │
│  │            │ │            │ │            │ │            │   │
│  │ MMR: 445   │ │ MMR: 380   │ │ MMR: 290   │ │ MMR: 310   │   │
│  │ ↓ 2%       │ │ ↓ 12%      │ │ ↓ 5%       │ │ ↓ 3%       │   │
│  │            │ │            │ │            │ │            │   │
│  │ Malaria: ↑ │ │ Malaria: → │ │ Malaria: ↓ │ │ Malaria: → │   │
│  │ Stock: 🔴  │ │ Stock: 🟡  │ │ Stock: 🟢  │ │ Stock: 🟢  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  RESOURCE FORECASTING                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [Budget Slider: 0M ———|——— 500M MWK]                           │
│                                                                 │
│  If 150M MWK allocated to malaria commodities in Nsanje:        │
│  • Projected stockout reduction: 65%                            │
│  • Projected lives saved: 120                                   │
│  • Cost per DALY averted: $285                                  │
│                                                                 │
│  [📋 EXPORT TO MTEF]  [📧 SHARE WITH MINISTRY OF FINANCE]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. DESIGN REVIEW CHECKLIST

Before any screen or component ships, it must pass:

### Functional Review
- [ ] All critical actions reachable with one thumb
- [ ] Offline state clearly indicated
- [ ] Sync status visible at all times
- [ ] Override always accessible
- [ ] Error states have clear recovery actions
- [ ] Loading states prevent user confusion

### Accessibility Review
- [ ] All touch targets ≥ 56×56dp
- [ ] Color never used alone to convey information
- [ ] Contrast ratio ≥ 4.5:1 for all text
- [ ] Screen reader labels present and accurate
- [ ] Text resizes to 200% without breaking layout

### Cultural Review
- [ ] All text reviewed by native Chichewa speaker
- [ ] Illustrations reviewed for cultural appropriateness
- [ ] No colors with negative cultural associations
- [ ] Gender balance in all representations
- [ ] No generic "African" stock imagery

### Performance Review
- [ ] Screen loads in <2 seconds on target device
- [ ] Animations do not block interaction
- [ ] No continuous animations (battery drain)
- [ ] Images compressed to <100KB
- [ ] No layout shift after load (CLS = 0 on web)

### Security Review
- [ ] No patient data visible in screenshots or demos
- [ ] No sensitive information in error messages
- [ ] All inputs sanitized
- [ ] No auto-fill on sensitive fields

---

## 15. DESIGN TOOLS & ASSETS

### Recommended Tools
- **Design:** Figma (shared team library with design tokens)
- **Prototyping:** Figma prototypes for CHW flows (test on actual Android device)
- **Iconography:** Phosphor Icons + custom Malawi health icons
- **Illustration:** Figma/Illustrator, exported as SVG (web) and VectorDrawable (Android)
- **User Testing:** Maze.co for remote testing, in-person testing at Neno/Nsanje clinics

### Asset Requirements
- [ ] Custom icon set (50 icons, SVG + VectorDrawable)
- [ ] Illustration library (20 scenes, SVG)
- [ ] Chichewa audio narration files (50 phrases, MP3, 64kbps)
- [ ] Video tutorials (5 videos, 30 seconds each, MP4, 5MB max)
- [ ] Photography guidelines (1-page brief for local photographer)
- [ ] Figma component library (all components as variants)

---

**END OF ZISAMALE DESIGN SYSTEM & UI/UX SPECIFICATION**

**Next Steps:**
1. Set up Figma team library with design tokens
2. Create component library (all buttons, cards, inputs as Figma variants)
3. Design 5 key screens: CHW Dashboard, Visit Form, DHO Alert Center, MoHP Scorecard, Login
4. Conduct usability testing with 5 CHWs in Neno (paper prototype first, then Figma)
5. Iterate based on feedback before engineering implementation
