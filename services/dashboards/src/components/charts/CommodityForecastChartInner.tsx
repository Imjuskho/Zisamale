import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { CommodityForecast } from "../../types";
import {
  CHART_COLORS,
  CHART_MARGINS,
  commonAxisProps,
  commonCartesianGridProps,
  commonTooltipProps,
} from "../../lib/chart-theme";

interface Props {
  commodities: CommodityForecast[];
}

export default function CommodityForecastChartInner({ commodities }: Props) {
  return (
    <div className="commodity-forecast">
      <h2>Commodity Demand Forecast</h2>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={commodities} margin={CHART_MARGINS}>
          <CartesianGrid {...commonCartesianGridProps} />
          <XAxis dataKey="commodity" {...commonAxisProps} />
          <YAxis
            {...commonAxisProps}
            label={{
              value: "Units (courses)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: CHART_COLORS.text, textAnchor: "middle" },
            }}
          />
          <Tooltip
            {...commonTooltipProps}
            formatter={(value: number) => [value.toLocaleString(), undefined as unknown as string]}
          />
          <Legend />
          <Bar dataKey="predicted_consumption" fill={CHART_COLORS.predicted} name="Predicted Consumption" radius={[4, 4, 0, 0]} />
          <Bar dataKey="recommended_order" fill={CHART_COLORS.recommended} name="Recommended Order" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
