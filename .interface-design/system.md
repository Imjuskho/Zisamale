# Zisamale Interface System

Decisions made. Hold to them; don't reinvent.

## Direction and feel
**Apple health operations** — quiet, precise, high-confidence interfaces with
Action Blue reserved for intent and system feedback. SF Pro/Inter form the
functional type voice; elevated white surfaces, compact charts, and generous
touch targets keep field and policy work clear without visual noise.

## Token architecture (`src/index.css` :root)
- Surfaces: `--color-surface-bg #FFFFFF` → `--color-surface-card #FAFAFC` → `--color-surface-elevated #FFFFFF`
- Ink: `--color-text #1D1D1F`, secondary `#48484A`, muted `#8E8E93`
- Brand: `--color-primary #0066CC`, `--color-primary-focus #0071E3`, and teal `#0F7B8A` for operational cues.
- Risk scale: `#FF3B30 / #FF9500 / #FFCC00 / #34C759` — single source in `src/design/riskScale.ts`.
- Charts use blue data, charcoal observed series, and `#F0F0F0` grids.

## Depth strategy
Quiet hairlines plus subtle layered shadows (`shadow.card/card-hover/elevated`);
dark mode uses surface shifts and `#3A3A3C` borders. Color communicates state,
not decoration.

## Spacing & density
4px base unit; card padding 16–24px; control zones tight (8–12px gaps), with
32px+ between sections. Buttons and touch targets are at least 44px.

## Hierarchy decisions
- Type scale ≈1.2–1.25 from 16px body; weight + color carry hierarchy more
  than size (label 12/500/muted/tracked · body 16/400 · data 28/700).
- One focal point per view: the map on DHO/MoHP pages, the risk badge on CHW.
- **Tabular numerals mandatory on dynamic figures**: `.text-data`,
  `.data-table td`, `.moyo-district-risk-chip`, `.kpi-trend-value`,
  `.badge-count` get `font-variant-numeric: tabular-nums`.
- KPICard anatomy: label 11/500/muted/uppercase/tracked → value 28/700 ink →
  trend 12/500 semantic color. Icon chip 40×40 r10 at `color+14` tint.

## Motion
- Named properties only, never `transition: all`. Enter/interactive ease:
  `cubic-bezier(0.23, 1, 0.32, 1)`; durations ≤200ms UI.
- Press feedback: hover lift shadow, `:active scale(0.96–0.97)`.
- Progress fills animate `width, background-color` only.
- `prefers-reduced-motion` collapses everything to opacity/color.

## Component patterns (reused 2+ times)
- Button primary — 44px minimum hit area · 14px 20–24px pad · r12 · Action Blue `#0066CC`, hover `#004F9E`
- Card — elevated white `#FFFFFF`/card `#FAFAFC` · quiet `#E8E8ED` hairline · r12–16 · `shadow.card`
- Risk chip — pill, bg from `riskScale.toneToColor(score)`, white text,
  tabular % figure
- Map legend/markers read colors from `riskScale.ts` — never local copies

## Known boundaries
- Marker-layer canvas colors (`markerLayers.tsx`) may use literal map
  semantics but must stay inside the palette above.
- i18n: translate via `useT()` by key alone (en+ny completeness tested).
- "Unverified" renders wherever backend data is `null` — never fabricate.
