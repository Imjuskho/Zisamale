// src/lib/chart-theme.ts
// Zisamale Recharts theme — drop-in color and style config

export const CHART_COLORS = {
  predicted: '#0EA5E9',      // sky-500
  recommended: '#0D9488',      // teal-600
  actual: '#0F172A',           // slate-900
  confidence: 'rgba(14, 165, 233, 0.20)',
  grid: '#F1F5F9',             // slate-100
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E2E8F0',
  text: '#64748B',             // slate-500
  textDark: '#0F172A',         // slate-900
} as const;

export const CHART_MARGINS = { top: 10, right: 30, left: 0, bottom: 0 };

export const commonAxisProps = {
  tick: { fill: CHART_COLORS.text, fontSize: 12, fontFamily: 'Inter, sans-serif' },
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
    borderRadius: '10px',
    boxShadow: '0 10px 15px rgba(15, 23, 42, 0.08)',
    padding: '12px 16px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
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

// Usage in a Recharts component:
// <BarChart data={data} margin={CHART_MARGINS}>
//   <CartesianGrid {...commonCartesianGridProps} />
//   <XAxis dataKey="name" {...commonAxisProps} />
//   <YAxis {...commonAxisProps} label={{ value: 'Units (courses)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: CHART_COLORS.text, fontSize: 12 } }} />
//   <Tooltip {...commonTooltipProps} />
//   <Bar dataKey="predicted" fill={CHART_COLORS.predicted} radius={[4, 4, 0, 0]} />
//   <Bar dataKey="recommended" fill={CHART_COLORS.recommended} radius={[4, 4, 0, 0]} />
// </BarChart>
