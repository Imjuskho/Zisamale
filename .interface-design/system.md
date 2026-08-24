# Zisamale Interface System

Decisions made. Hold to them; don't reinvent.

## Direction and feel
**Malawi earth editorial** — warm paper, terracotta clay, lake teal. A field
operations room printed on heavy paper stock: authoritative but humane,
editorial not SaaS-chrome. Serif display voice (Fraunces) for page/section
titles; Archivo for everything functional. Paper-grain texture on the canvas
(`--grain-image`) is the signature — never add gradients or glassmorphism on top.

## Token architecture (`src/index.css` :root)
- Surfaces: `--color-surface-bg #F6F1E7` → `--color-surface-card #FFFDF8` → `--color-surface-elevated #FFFFFF`
- Ink: `--color-text #29241C`, secondary `#55503F`, muted `#776D5C`
- Brand: `--color-primary #A8502F` (clay), `--color-teal #17646C`, `--color-green #2D7D46`
- Risk scale: `#C62828 / #E65100 / #F9A825 / #2E7D32` — single source in
  `src/design/riskScale.ts`; Tailwind `risk.*` tokens mirror it. Never invent
  status hexes (`#15803d`, `#dc2626`, `#0f7b8a` are retired).
- Charts bind to the same world: grid/borders `#E3D9C6`, ticks `#776D5C`,
  ink lines `#29241C`, teal series `#17646C`.

## Depth strategy
Subtle layered shadows only (tokens `shadow.card/card-hover/elevated`);
borders are quiet dividers `#E3D9C6`. Dark mode flips to surface shifts +
`#3C3327` borders (see `.dark` block + `src/styles/dark.css`). One hue per
surface family; lightness does the elevation work.

## Spacing & density
4px base unit; card padding 16–24px; control zones tight (8–12px gaps),
real air between sections (32px+). Buttons 56px min-height/min-width (glove +
outdoor use). Hit areas ≥44px everywhere interactive.

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
- Button primary — 56px h · 14px 24px pad · r12 · bg clay, hover `#8A3E22`
- Card — bg `#FFFDF8` · border `#E3D9C6` · r12–16 · `shadow.card`
- Risk chip — pill, bg from `riskScale.toneToColor(score)`, white text,
  tabular % figure
- Map legend/markers read colors from `riskScale.ts` — never local copies

## Known boundaries
- Marker-layer canvas colors (`markerLayers.tsx`) may use literal map
  semantics but must stay inside the palette above.
- i18n: translate via `useT()` by key alone (en+ny completeness tested).
- "Unverified" renders wherever backend data is `null` — never fabricate.
