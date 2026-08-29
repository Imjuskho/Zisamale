# Zisamale UI Migration Checklist

## Pre-flight
- [ ] Back up current `tailwind.config.js`, `index.css`, `components.css`
- [ ] Verify no other files import `Archivo` or `Fraunces` fonts
- [ ] Run `npm ls` to confirm `html2canvas`, `jspdf`, `@tailwindcss/typography` are uninstalled

## Step 1: Config (5 min)
- [ ] Replace `tailwind.config.js` with the new file
- [ ] Restart dev server (Tailwind needs to rebuild the class map)

## Step 2: Global Styles (5 min)
- [ ] Replace `index.css` with the new file
- [ ] Verify Inter and JetBrains Mono load in DevTools Network tab
- [ ] Check `font-family` on `<body>` shows "Inter"

## Step 3: Component Styles (10 min)
- [ ] Replace `components.css` with the new file
- [ ] Check for any `@apply` errors in build output
- [ ] Verify no broken classes (search for old color names like `zisamale-green`)

## Step 4: Component Updates

### KPICard
- [ ] Replace old card classes with `kpi-card`, `kpi-label`, `kpi-value`, `kpi-context`
- [ ] Add `kpi-value-zero` for zero values, `kpi-value-missing` for null
- [ ] Add trend arrows with `kpi-trend-*` classes

### AlertCard
- [ ] Use `alert-card` + severity modifier (`alert-card-critical`, etc.)
- [ ] Structure: `alert-header` → `alert-body` → `alert-actions`
- [ ] Hero alert: use `alert-hero` for AI Recommendation

### Sidebar
- [ ] Apply `sidebar`, `sidebar-nav`, `sidebar-nav-item` classes
- [ ] Add `active` class via NavLink `isActive`
- [ ] Add mobile hamburger + overlay logic
- [ ] Add language toggle in `sidebar-footer`

### Data Tables
- [ ] Wrap in `data-table-wrapper`
- [ ] Apply `data-table` class
- [ ] Add `scope="col"` to all `<th>`
- [ ] Add `<caption className="sr-only">`
- [ ] Make rows keyboard accessible (`tabIndex`, `role="button"`, `onKeyDown`)

### Charts
- [ ] Import `CHART_COLORS`, `commonAxisProps`, `commonCartesianGridProps`, `commonTooltipProps`
- [ ] Replace hardcoded colors with theme tokens
- [ ] Add Y-axis labels
- [ ] Verify tooltips match new style

### District Cards
- [ ] Use `district-grid` wrapper
- [ ] Apply `district-card` + sub-element classes
- [ ] Replace horizontal scroll with responsive grid

### Scenario Cards (CHUMA)
- [ ] Apply `scenario-card` + `scenario-metric-grid`
- [ ] Style range slider with `range-slider` class
- [ ] Use `scenario-verdict` for cost-effectiveness banner

### Map
- [ ] Add `map-container` wrapper
- [ ] Move controls into `map-toolbar` above map
- [ ] Style legend with `map-legend`
- [ ] Set `scrollWheelZoom={false}`

### Buttons
- [ ] Replace all button classes with `btn btn-md btn-primary` (etc.)
- [ ] Add `focus-visible:shadow-focus` behavior

### Forms
- [ ] Replace inputs with `input` class
- [ ] Replace selects with `select` class
- [ ] Add error states with `input-error`

## Step 5: Dark Mode
- [ ] Test toggle with `document.documentElement.classList.toggle('dark')`
- [ ] Verify all cards, tables, inputs invert correctly
- [ ] Check chart tooltips in dark mode

## Step 6: Responsive
- [ ] Test on 375px width (iPhone SE)
- [ ] Verify sidebar collapses to hamburger
- [ ] Verify tables scroll horizontally
- [ ] Verify KPI grid becomes 2-col then 1-col

## Step 7: Accessibility
- [ ] Run axe DevTools — should report 0 violations
- [ ] Tab through entire page — all interactive elements reachable
- [ ] Check contrast ratios — all text ≥ 4.5:1
- [ ] Verify `sr-only` skip link works

## Step 8: Polish
- [ ] Verify no "Loading..." text — all replaced with skeletons
- [ ] Verify empty states use `EmptyState` component
- [ ] Verify no hardcoded English strings (use `useT()`)
- [ ] Check for console errors

## Done
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Visual regression check against screenshots
