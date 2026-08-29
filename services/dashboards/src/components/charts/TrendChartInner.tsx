import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CaseTrend } from "../../types";
import {
  CHART_COLORS,
  CHART_MARGINS,
  commonAxisProps,
  commonCartesianGridProps,
  commonTooltipProps,
} from "../../lib/chart-theme";

interface Props {
  actual: CaseTrend[];
  predicted: CaseTrend[];
  title?: string;
  height?: number;
  showThreshold?: boolean;
}

export default function TrendChartInner({
  actual,
  predicted,
  title = "Case Trends: Actual vs Predicted",
  height = 400,
  showThreshold = true,
}: Props) {
  const merged = actual.map((a, i) => {
    const pred = predicted[i];
    return {
      week: a.week,
      actual: a.cases,
      predicted: pred?.cases ?? 0,
      ci_lower: pred?.ci_lower ?? 0,
      ci_upper: pred?.ci_upper ?? 0,
    };
  });

  const lastActualIdx = actual.length - 1;
  const lastActualWeek = merged[lastActualIdx]?.week;

  return (
    <div className="chart-container card">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={merged} margin={CHART_MARGINS}>
          <CartesianGrid {...commonCartesianGridProps} />
          <Area
            type="monotone"
            dataKey="ci_upper"
            stroke="none"
            fill={CHART_COLORS.predicted}
            fillOpacity={0.2}
            name="95% CI Upper"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="ci_lower"
            stroke="none"
            fill="#FFFFFF"
            fillOpacity={1}
            name="95% CI Lower"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={CHART_COLORS.predicted}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            name="Predicted"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={CHART_COLORS.actual}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLORS.actual }}
            name="Actual"
            connectNulls
          />
          {showThreshold && lastActualWeek && (
            <ReferenceLine
              x={lastActualWeek}
              stroke={CHART_COLORS.danger}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Now",
                position: "top",
                fontSize: 11,
                fill: CHART_COLORS.danger,
              }}
            />
          )}
          <XAxis
            dataKey="week"
            {...commonAxisProps}
            interval={Math.max(0, Math.floor(merged.length / 8))}
          />
          <YAxis {...commonAxisProps} domain={[0, "auto"]} allowDataOverflow={false} />
          <Tooltip
            {...commonTooltipProps}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="line" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
