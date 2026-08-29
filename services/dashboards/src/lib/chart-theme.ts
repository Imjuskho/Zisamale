// src/lib/chart-theme.ts
// Apple Design System — Recharts theme tokens

export const CHART_COLORS = {
  predicted: '#0066cc',      // Apple blue
  recommended: '#aeaeb2',    // Apple gray400
  actual: '#1d1d1f',         // Apple ink
  confidence: 'rgba(0, 102, 204, 0.12)',
  grid: '#f0f0f0',           // Apple divider
  danger: '#ff9500',         // Apple orange
  tooltipBg: '#fafafc',      // Apple pearl
  tooltipBorder: '#e8e8ed',  // Apple hairline
  text: '#8e8e93',           // Apple gray500
  textDark: '#1d1d1f',       // Apple ink
} as const;

export const CHART_MARGINS = { top: 10, right: 30, left: 0, bottom: 0 };

export const commonAxisProps = {
  tick: { fill: CHART_COLORS.text, fontSize: 12, fontFamily: "'SF Pro Text', 'Inter', system-ui, sans-serif" },
  axisLine: { stroke: CHART_COLORS.grid },
  tickLine: { stroke: CHART_COLORS.grid },
};

export const commonCartesianGridProps = {
  strokeDasharray: '4 4',
  stroke: CHART_COLORS.grid,
  vertical: false,
};

export const commonTooltipProps = {
  contentStyle: {
    backgroundColor: CHART_COLORS.tooltipBg,
    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
    borderRadius: '12px',
    padding: '12px 16px',
    fontFamily: "'SF Pro Text', 'Inter', system-ui, sans-serif",
    fontSize: 14,
  },
  labelStyle: {
    color: CHART_COLORS.textDark,
    fontWeight: 600,
    marginBottom: 4,
  },
  itemStyle: {
    color: CHART_COLORS.text,
  },
};
