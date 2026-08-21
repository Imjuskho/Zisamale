import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { CaseTrend } from "../../types";

interface Props {
  actual: CaseTrend[];
  predicted: CaseTrend[];
}

export function TrendChart({ actual, predicted }: Props) {
  const merged = actual.map((a, i) => ({
    week: a.week,
    actual: a.cases,
    predicted: predicted[i]?.cases || 0,
    ci_lower: predicted[i]?.ci_lower || 0,
    ci_upper: predicted[i]?.ci_upper || 0,
  }));

  return (
    <div className="trend-chart">
      <h2>Case Trends: Actual vs Predicted</h2>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} interval={3} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="ci_upper"
            stroke="none"
            fill="#93c5fd"
            fillOpacity={0.3}
            name="95% CI Upper"
          />
          <Area
            type="monotone"
            dataKey="ci_lower"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            name="95% CI Lower"
          />
          <Line type="monotone" dataKey="actual" stroke="#1e40af" strokeWidth={2} name="Actual Cases" dot={false} />
          <Line type="monotone" dataKey="predicted" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" name="Predicted Cases" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
