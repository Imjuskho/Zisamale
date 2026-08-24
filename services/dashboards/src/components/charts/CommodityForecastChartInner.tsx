import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { CommodityForecast } from "../../types";

interface Props {
  commodities: CommodityForecast[];
}

export default function CommodityForecastChartInner({ commodities }: Props) {
  return (
    <div className="commodity-forecast">
      <h2>Commodity Demand Forecast</h2>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={commodities}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="commodity" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="predicted_consumption" fill="#3b82f6" name="Predicted Consumption" />
          <Bar dataKey="recommended_order" fill="#10b981" name="Recommended Order" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
