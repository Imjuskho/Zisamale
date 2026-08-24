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
        <AreaChart data={merged} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3D9C6" />
          <Area
            type="monotone"
            dataKey="ci_upper"
            stroke="none"
            fill="#17646C"
            fillOpacity={0.2}
            name="95% CI Upper"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="ci_lower"
            stroke="none"
            fill="#FFFDF8"
            fillOpacity={1}
            name="95% CI Lower"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#17646C"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            name="Predicted"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#29241C"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#29241C" }}
            name="Actual"
            connectNulls
          />
          {showThreshold && lastActualWeek && (
            <ReferenceLine
              x={lastActualWeek}
              stroke="#C62828"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Now", position: "top", fontSize: 11, fill: "#C62828" }}
            />
          )}
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "#776D5C" }}
            interval={Math.max(0, Math.floor(merged.length / 8))}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#776D5C" }}
            domain={[0, "auto"]}
            allowDataOverflow={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E3D9C6",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontSize: 13,
            }}
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
