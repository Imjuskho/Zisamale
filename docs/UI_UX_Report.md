# Zisamale Platform — UI/UX Audit Report

**Date:** August 21, 2026  
**Scope:** Web dashboards (React + Vite + Tailwind + Redux), design system, Android Jetpack Compose theme  
**Auditor:** Zisamale Engineering

---

## Executive Summary

The platform has **two parallel UI systems that never connect**: a polished, bilingual, offline-aware design system (`src/components/design/*` + `i18n.ts` + Tailwind tokens) that is 100% dead code, and the live application (pages + `components.css`) which is functional but English-only, with hardcoded styles, accessibility gaps, and no mobile layout. The Android app correctly mirrors the web design tokens — the strongest cross-platform consistency win.

| Category | Verdict | Severity |
|---|---|---|
| Design tokens & theming | **Good** | — |
| Live dashboard UX | **Needs work** | Medium |
| Accessibility (WCAG 2.1 AA) | **Several failures** | High |
| Bilingual (Chichewa/English) | **Built but not wired** | High |
| Mobile responsiveness | **Poor** | High |
| Code hygiene | **12 dead components, 3 dead dependencies** | Medium |

**Total design system components:** 8 (RiskBadge, AlertCard, KPICard, EmptyState, OfflineBanner, SyncIndicator, Stepper, BilingualText) — all dead code.  
**Total live components:** 14 functional components, all unstyled semantically until `components.css` was added.  
**Total CSS:** ~1,500 lines across `index.css` (design tokens + base classes) and `components.css` (component styles).

---

## Part 1 — Design Tokens & Theming

### 1.1 Color System

| Token | Hex | Usage |
|---|---|---|
| Zisamale Green | `#2D7D46` | Primary brand, buttons, active states |
| Zisamale Teal | `#0F7B8A` | Secondary, links, focus rings |
| Dark | `#1A1A2E` | Text, headings |
| Light | `#F5F5F0` | Background |
| Risk Critical | `#C62828` | Red alerts, danger |
| Risk High | `#E65100` | Orange warnings |
| Risk Medium | `#F9A825` | Yellow attention |
| Risk Low | `#2E7D32` | Green clear |
| Info Blue | `#1565C0` | Informational |
| Neutral | `#616161` | Secondary text |

**Quality: Good.** Consistent 4-tier risk palette with light backgrounds. All colors pass WCAG AA contrast against white.

**Issues:**
- CSS custom properties (`--color-*`) in `index.css` duplicate Tailwind config tokens — two sources of truth, drift risk.
- `.risk-badge-medium` applies `bg-risk-medium text-risk-medium` — amber background with amber text = **invisible text** (index.css line 140).
- Inter font declared but never loaded from Google Fonts — falls back to system-ui silently.

### 1.2 Typography

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 32px | Bold | — (unused in live app) |
| Headline | 24px | Bold | Page titles |
| Title | 20px | Semibold | Section headers |
| Body | 18px | Normal | Paragraphs |
| Body (small) | 16px | Normal | Table cells, form text |
| Caption | 14px | Medium | Labels, metadata |
| Label | 12px | Medium | Table headers, badges |

**Quality: Good.** Clear hierarchy. Body at 18px is excellent for low-literacy field use.

### 1.3 Spacing & Layout

- 8dp grid system configured in Tailwind.
- 56px minimum touch targets on primary buttons and inputs (excellent for field tablets).
- 16px border-radius on cards (consistent, modern).
- **Issue:** No responsive breakpoints defined anywhere. Fixed 280px sidebar + `max-w-[1400px]` main content = no mobile path.

### 1.4 Shadows & Elevation

| Token | Usage |
|---|---|
| `shadow-card` | Default cards, buttons |
| `shadow-elevated` | Modals, focused elements |
| `shadow-critical` | Alert cards |

**Quality: Good.** Three-tier elevation system. `shadow-critical` adds red-tinted glow to danger cards.

---

## Part 2 — Internationalization (i18n)

### 2.1 String Coverage

`i18n.ts` defines 60+ string pairs covering:
- Navigation (dashboard, alerts, map, trends, CHWs, logout)
- Risk levels (critical, high, medium, low, none)
- Actions (acknowledge, escalate, dismiss, override, export)
- Sync states (synced, syncing, offline, error, lastSync)
- Empty states (noAlerts, noData, noVisits)
- Offline messaging (offlineMode, offlineDataSaved)
- Override reasons (professionalJudgment, culturalFactors, patientRequest)
- Roles and greetings

**Quality: Broad but shallow.** Coverage is good for scope, but:

### 2.2 Critical Issues

| Issue | Severity | Detail |
|---|---|---|
| **Dead code** | Critical | Zero live pages import `i18n.ts`. All bilingual strings are unreachable. |
| **Wrong language code** | High | Uses `"cy"` (Welsh). Chichewa ISO 639-1 is `"ny"`. The NLG component correctly uses `"ny"` — the two systems disagree. |
| **Machine-draft quality** | Medium | `trends.cy = "Malingaliro"` (means "opinions"), `cancel.cy = "Ganizirani"` (means "think about it"), `chws.cy = "ASHA"` (Indian acronym, wrong region). |
| **Placeholder text** | Medium | `districtScorecard.cy = "Kadi ya Zaumoyo ya D District"` — literal placeholder left in. |
| **No interpolation** | Low | No pluralization, date formatting, or number localization. |
| **No language persistence** | Low | No localStorage save of language preference. |

### 2.3 Recommendation

Hire a certified Chichewa translator for all `.cy` strings. The current translations were machine-generated and contain errors that could confuse health workers. The NLG component's comment admitting this is honest — it should apply to the entire i18n module.

---

## Part 3 — Component-by-Component Audit

### 3.1 Sidebar (`Sidebar.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Navigation | Good | NavLink active states, role-filtered items |
| User info | Good | Avatar, name, role display |
| Theme toggle | Adequate | Text-only, no icon |
| Accessibility | Needs work | Active state conveyed by color only (WCAG 1.4.1) |
| Mobile | Poor | Fixed 280px, no collapse/hamburger |
| Bilingual | Poor | All labels hardcoded English |

**Issues:**
- No skip-to-content link.
- No icons beside labels (icon+label aids scanability for low-literacy users).
- Logout has no confirmation dialog — accidental tap logs user out.
- No hover/collapse state for the fixed sidebar.

### 3.2 Login Page (`LoginPage.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Form structure | Good | Proper label/id pairing, autoComplete attributes |
| Error handling | Good | `role="alert"` on error, client-side validation |
| Security | Poor | User self-selects role from dropdown (should derive from credentials) |
| Loading state | Poor | No disabled/loading state on submit — double-submit possible |
| Mobile | Adequate | max-width: 400px centers well |
| Bilingual | Poor | English only |

**Anti-pattern:** `navigate()` called during render body when authenticated (side effect in render). Should use `<Navigate>` component or `useEffect`.

### 3.3 DHO Dashboard (`DHODashboard.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Layout | Good | Header → Alerts → Map → Trends → CHW Table |
| Live updates | Good | WebSocket with `role="status"` on status pill |
| Loading state | Poor | Bare "Loading..." text, no skeleton/spinner, no `aria-busy` |
| Error state | Poor | Failed fetches render nothing — no error UI |
| Data transparency | Excellent | AUC-ROC, sensitivity, specificity displayed |
| Bilingual | Poor | English only |

**Duplicate code:** `LEVEL_TO_RISK = { low: 0.22, medium: 0.47, high: 0.86 }` duplicated in MoHPDashboard. Should be shared constant.

### 3.4 MoHP Dashboard (`MoHPDashboard.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Layout | Good | National Overview → Map (520px) → Executive Summary |
| Data density | Good | Three complementary views |
| Visual nesting | Poor | Yellow-green `executive-summary` box wraps white NLG card — nested-card noise |
| Loading/error | Poor | Same issues as DHO |
| Bilingual | Poor | English only |

### 3.5 CHUMA Dashboard (`CHUMADashboard.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Content | Adequate | Commodity chart + Budget Modeler |
| Loading state | Poor | Renders only BudgetModeler when no forecast — no spinner, no error |
| Heading duplication | Poor | Section `<h2>` directly above component's own `<h2>` |
| Weakest page | — | Least complete of the three dashboards |

### 3.6 Alert Command Center (`AlertCommandCenter.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Filtering | Excellent | Disease, level, status filters with proper labels |
| Card design | Good | Risk-colored left borders, severity sorting |
| Action buttons | Poor | Unstyled native browser buttons — visually inconsistent |
| Dismiss UX | Poor | Instant, irreversible, no undo — high-stakes in health context |
| Accessibility | Adequate | `aria-label` per alert article, `data-testid`s |
| Timeline chart | Poor | Mouse-only, no accessible table alternative |
| Crash risk | Bug | `alert.confidence_interval[0]` accessed without optional chaining |
| Bilingual | Poor | English only |

### 3.7 CHW Performance Table (`CHWPerformanceTable.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Data design | Good | Sync status, visit completion, expandable households |
| Keyboard access | Poor | Clickable `<tr>` with no `tabIndex`, no `role="button"`, no Enter/Space handler |
| Legend accuracy | Bug | Says "Red border" but applies background tint |
| Contrast | Bug | Sync badge white-on-amber `#d97706` ≈ 3.0:1 — fails WCAG AA |
| Pagination | Missing | No virtualization for large rosters |
| Bilingual | Poor | English only |

### 3.8 National Overview (`NationalOverview.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Data density | Good | 7 columns of district health metrics |
| Table structure | Poor | No `scope="col"`, no caption, no sortable columns |
| Mobile | Poor | No horizontal scroll wrapper — will break on small screens |
| Risk badge rendering | Bug | Uses `.risk-badge` (48×48px circle) to display words — text overflows |
| Interactivity | Missing | Can't click through to a district |
| Bilingual | Poor | English only |

### 3.9 Budget Modeler (`BudgetModeler.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Engine | Excellent | Documented policy model with citations, 28 districts, diminishing-returns curve |
| UX | Good | Side-by-side Scenario A/B, plain-language verdict with `role="status"` |
| Accessibility | Good | `<dl>/<dt>/<dd>` semantic markup, labeled inputs |
| Slider | Adequate | Missing `aria-valuetext` for screen readers |
| Touch | Adequate | 5M-step slider over 800M range is coarse on mobile |
| Bilingual | Poor | English only |

### 3.10 NLG Executive Summary (`NLGExecutiveSummary.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Content | Good | Weekly briefing template with outbreak/alerts/coverage |
| Language toggle | Good | EN/Chichewa with `aria-pressed` |
| Export | Adequate | .txt download — `PDFExport.tsx` exists but is unwired |
| Date display | Poor | ISO format only — not human-friendly |
| Chichewa quality | Poor | Machine-draft translations need certified review |
| Bilingual | Best in class | Only component with actual bilingual toggle |

### 3.11 LeafletMap (`LeafletMap.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Map rendering | Good | OSM tiles, attribution, legend, info panel |
| Accessibility | Poor | GeoJSON layers are pointer-only; no keyboard-accessible district list |
| Data integrity | Risk | District shapes are placeholder hexagons, not real boundaries |
| Offline | Misleading | Documented service worker strategy doesn't exist yet |
| Scroll capture | Poor | `scrollWheelZoom` traps page scrolling on laptops |
| CSS conflict | Bug | Inline legend positioning fights `components.css` classes |
| Bilingual | Poor | English-only popups/legend |

### 3.12 Theme Toggle (`ThemeToggle.tsx`)

| Aspect | Rating | Notes |
|---|---|---|
| Functionality | Adequate | Toggles `.dark` on `<html>`, Redux-backed |
| Persistence | Unknown | May reset on refresh if Redux slice doesn't hydrate |
| Visual | Poor | Text-only button ("Dark Mode"/"Light Mode"), no icon |
| Effectiveness | Partial | Only hand-written `.dark` CSS overrides work; Tailwind `dark:` variants unused |
| Detection | Missing | No `prefers-color-scheme` default |

---

## Part 4 — Dead Design System Components

The following components exist in `src/components/design/` and represent the intended product language — but **nothing imports them**:

| Component | Purpose | Quality | Issue |
|---|---|---|---|
| `RiskBadge.tsx` | Risk score circle + RiskCard | Good concept | Hardcodes `.cy` labels; threshold 0-10 vs live data 0-1 |
| `AlertCard.tsx` | Styled alert with actions | Good | — |
| `KPICard.tsx` | Metric card with trend arrow | Good | — |
| `EmptyState.tsx` | Empty state placeholder | Good | — |
| `OfflineBanner.tsx` | Teal offline notification bar | Good | — |
| `SyncIndicator.tsx` | Sync status dot | Good | — |
| `Stepper.tsx` | Numeric stepper input | Good | No `aria-valuenow` |
| `BilingualText.tsx` | Chichewa primary / English secondary | Good | Uses wrong `"cy"` language code |

**These components are well-built but disconnected.** They should be integrated into the live pages to replace the ad-hoc styling.

---

## Part 5 — Android Theme

### 5.1 `Theme.kt`

Mirrors web design tokens exactly:
- `ZisamaleGreen = Color(0xFF2D7D46)` ✓
- `ZisamaleTeal = Color(0xFF0F7B8A)` ✓
- `RiskCritical = Color(0xFFC62828)` ✓
- Dark/light color schemes with proper surfaces ✓
- Material3 shapes: small=8dp, medium=12dp, large=16dp, extraLarge=24dp ✓

**Quality: Good.** Strongest cross-platform consistency in the codebase.

### 5.2 `Type.kt`

Full Material3 typography scale matching web tokens:
- `displayLarge` = 32px Bold (matches web `display`)
- `headlineLarge` = 24px Bold (matches web `headline`)
- `bodyLarge` = 18px Normal (matches web `body`)
- `labelLarge` = 14px Medium (matches web `caption`)

**Quality: Good.** Consistent type hierarchy.

---

## Part 6 — Critical Bugs

| # | Component | Bug | Severity |
|---|---|---|---|
| 1 | `index.css` | `.risk-badge-medium` same bg and text color — invisible text | High |
| 2 | `AlertCommandCenter` | `confidence_interval[0]` without optional chaining — crash on missing data | High |
| 3 | `CHWPerformanceTable` | Legend says "Red border" but CSS applies background tint | Low |
| 4 | `CHWPerformanceTable` | Sync badge contrast 3.0:1 — fails WCAG AA | Medium |
| 5 | `NationalOverview` | `.risk-badge` (48px circle) used for text badges — overflow | Medium |
| 6 | `i18n.ts` | Wrong language code `"cy"` (Welsh) for Chichewa `"ny"` | High |
| 7 | `LoginPage` | `navigate()` in render body — side effect in render | Medium |
| 8 | `LeafletMap` | Inline styles conflict with `components.css` legend positioning | Low |
| 9 | `CHUMADashboard` | Duplicate `<h2>` headings | Low |

---

## Part 7 — Accessibility Summary (WCAG 2.1 AA)

### Passes
- Form inputs have associated `<label>` elements
- Login error uses `role="alert"`
- WebSocket status uses `role="status"`
- Alert articles have `aria-label`
- NLG language toggle uses `aria-pressed`
- Budget modeler uses semantic `<dl>/<dt>/<dd>`
- 56px minimum touch targets on primary buttons
- Focus rings on inputs/selects

### Failures
| Criterion | Component | Issue |
|---|---|---|
| 1.1.1 Non-text Content | LeafletMap | No text alternative for map |
| 1.3.1 Info & Relationships | NationalOverview | Table missing `scope="col"`, no caption |
| 1.4.1 Use of Color | Sidebar | Active state conveyed by color only |
| 1.4.3 Contrast (Minimum) | CHWPerformanceTable | Sync badge 3.0:1 < 4.5:1 required |
| 2.1.1 Keyboard | CHWPerformanceTable | Clickable `<tr>` not keyboard accessible |
| 2.1.1 Keyboard | LeafletMap | GeoJSON layers pointer-only |
| 2.4.1 Bypass Blocks | App | No skip-to-content link |
| 2.4.6 Headings | CHUMADashboard | Duplicate `<h2>` headings |
| 3.3.2 Labels | BudgetModeler | Range slider missing `aria-valuetext` |
| 4.1.2 Name, Role, Value | CHWPerformanceTable | `aria-expanded` on `<tr>` is non-standard |

---

## Part 8 — Mobile Responsiveness

| Component | Mobile Status | Issue |
|---|---|---|
| Sidebar | **Broken** | Fixed 280px never collapses — consumes entire phone viewport |
| Login | OK | max-width: 400px centers well |
| DHO Dashboard | Poor | No responsive grid, tables overflow |
| MoHP Dashboard | Poor | Map height fixed at 520px |
| CHUMA Dashboard | Poor | No responsive layout |
| AlertCommandCenter | Poor | Filter row may wrap awkwardly |
| Tables (all) | **Broken** | No horizontal scroll wrapper, will overflow |
| LeafletMap | Adequate | Map itself is responsive; legend/panel overlap on small screens |
| BudgetModeler | Adequate | `minWidth: 280` allows wrapping |

**No responsive breakpoints exist anywhere in the codebase.** The Tailwind config defines no custom breakpoints (uses defaults: sm=640, md=768, lg=1024, xl=1280), but no component uses responsive utility classes.

---

## Part 9 — Code Hygiene

### Dead Code
- 8 design system components (never imported)
- `i18n.ts` (only imported by dead components)
- `PDFExport.tsx` (exists, dependencies installed, never wired)
- `RiskMap.tsx` (superseded by `LeafletMap.tsx`)
- `NLGSummary.tsx` (superseded by `NLGExecutiveSummary.tsx`)
- `AlertInbox.tsx` (superseded by `AlertCommandCenter.tsx`)
- `DataTable.tsx` (generic, never used by any page)

### Dead Dependencies
- `@tailwindcss/typography` (installed, not registered in plugins)
- `html2canvas` + `jspdf` (for unwired PDFExport)
- `react-to-print` (installed, never imported)

### Duplicate Code
- `LEVEL_TO_RISK` constant duplicated in DHO and MoHP dashboards
- Inline styles in LoginPage duplicate `components.css` login classes
- CSS custom properties in `index.css` duplicate Tailwind config tokens

---

## Part 10 — Recommendations

### Priority 1: High Impact, Low Effort
1. **Fix the 9 critical bugs** listed in Part 6 — especially invisible text, crash risk, and wrong language code.
2. **Import `components.css` was done** — verify HMR is serving the updated styles.
3. **Add `scope="col"` and captions** to NationalOverview and CHW tables.
4. **Add `aria-valuetext`** to BudgetModeler range slider.
5. **Fix sync badge contrast** — darken amber from `#d97706` to `#b45309` (4.6:1).

### Priority 2: High Impact, Medium Effort
6. **Wire the design system components** into live pages — replace ad-hoc alert cards with `AlertCard`, add `KPICard` metrics rows, use `EmptyState` for loading/empty conditions.
7. **Wire `i18n.ts` into all pages** — add language toggle to sidebar, translate all hardcoded English strings.
8. **Hire certified Chichewa translator** — current machine-draft translations contain errors that could confuse health workers.
9. **Add responsive sidebar** — hamburger menu on mobile, collapsible on tablet.
10. **Add table horizontal scroll wrappers** — prevents mobile overflow.
11. **Add loading skeletons and error states** to all dashboards.

### Priority 3: Medium Impact, High Effort
12. **Wire `PDFExport.tsx`** — jsPDF and html2canvas are already installed.
13. **Build a real CHW dashboard** — the `/chw` route currently renders the DHO view. The design system components (`Stepper`, `SyncIndicator`, `OfflineBanner`) were designed for a CHW experience.
14. **Replace placeholder hexagons** in LeafletMap with real GADM district boundaries.
15. **Add keyboard navigation** to LeafletMap (district list alternative).
16. **Implement service worker** for offline tile caching.
17. **Add skip-to-content link** and `prefers-reduced-motion` guards.
18. **Remove dead code** — 8 unused components, 3 unused dependencies, 3 superseded files.

---

## Appendix A — File Inventory

### Live Files (actively used by pages)

| File | Lines | Purpose |
|---|---|---|
| `src/index.css` | 169 | Tailwind entry, design tokens, base classes |
| `src/styles/components.css` | 1,337 | Component styles for all live components |
| `src/i18n.ts` | ~120 | Chichewa/English string pairs (dead) |
| `tailwind.config.js` | ~80 | Theme configuration |
| `postcss.config.js` | 6 | PostCSS pipeline |
| `src/App.tsx` | 65 | Routing, layout shell |
| `src/main.tsx` | 15 | Entry point, CSS imports |
| `src/pages/LoginPage.tsx` | 108 | Login form |
| `src/pages/DHODashboard.tsx` | 85 | DHO view |
| `src/pages/MoHPDashboard.tsx` | 44 | MoHP view |
| `src/pages/CHUMADashboard.tsx` | 34 | CHUMA view |
| `src/components/Sidebar.tsx` | 75 | Navigation |
| `src/components/ThemeToggle.tsx` | 23 | Dark mode toggle |
| `src/components/AlertCommandCenter.tsx` | ~250 | Alert management |
| `src/components/CHWPerformanceTable.tsx` | ~200 | CHW roster |
| `src/components/common/NationalOverview.tsx` | ~80 | District table |
| `src/components/BudgetModeler.tsx` | ~200 | Policy model |
| `src/components/NLGExecutiveSummary.tsx` | ~150 | Weekly briefing |
| `src/components/LeafletMap.tsx` | ~200 | Risk map |
| `src/components/charts/TrendChart.tsx` | ~60 | Surveillance trends |
| `src/components/charts/CommodityForecastChart.tsx` | ~60 | Commodity forecast |

### Dead Files (never imported by live pages)

| File | Superseded By |
|---|---|
| `src/components/design/RiskBadge.tsx` | — (intended replacement) |
| `src/components/design/AlertCard.tsx` | — |
| `src/components/design/KPICard.tsx` | — |
| `src/components/design/EmptyState.tsx` | — |
| `src/components/design/OfflineBanner.tsx` | — |
| `src/components/design/SyncIndicator.tsx` | — |
| `src/components/design/Stepper.tsx` | — |
| `src/components/design/BilingualText.tsx` | — |
| `src/components/RiskMap.tsx` | `LeafletMap.tsx` |
| `src/components/NLGSummary.tsx` | `NLGExecutiveSummary.tsx` |
| `src/components/alerts/AlertInbox.tsx` | `AlertCommandCenter.tsx` |
| `src/components/DataTable.tsx` | — (never used) |
| `src/components/PDFExport.tsx` | — (never wired) |
| `docs/Zisamale_Design_System_UIUX.md` | This report |

---

*End of report.*
