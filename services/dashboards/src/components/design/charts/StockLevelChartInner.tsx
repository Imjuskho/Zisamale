import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CommodityForecast } from "../../../types";

interface StockLevelChartProps {
  commodities: CommodityForecast[];
  height?: number;
}

function stockColor(stockoutRisk: number): string {
  if (stockoutRisk > 0.7) return "#c62828";
  if (stockoutRisk > 0.4) return "#e65100";
  if (stockoutRisk > 0.2) return "#f9a825";
  return "#2d7d46";
}

function stockLabel(stockoutRisk: number): string {
  if (stockoutRisk > 0.7) return "Critical (<1 week)";
  if (stockoutRisk > 0.4) return "Warning (1-2 weeks)";
  if (stockoutRisk > 0.2) return "Caution (2-3 weeks)";
  return "Adequate (>3 weeks)";
}

export default function StockLevelChartInner({ commodities, height = 350 }: StockLevelChartProps) {
  const data = commodities.map((c) => ({
    name: c.commodity,
    consumption: c.predicted_consumption,
    recommended: c.recommended_order,
    stockoutRisk: c.stockout_risk,
    district: c.district,
  }));

  return (
    <div className="chart-container card">
      <h3 className="chart-title">Stock Levels by Commodity</h3>
      <p className="chart-subtitle">
        Color indicates stockout risk level
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#666" }}
            label={{ value: "Units", position: "bottom", fontSize: 11, fill: "#999" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#333" }}
            width={120}
          />
          <ReferenceLine
            x={0}
            stroke="#c62828"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontSize: 13,
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === "consumption") {
                return [
                  value.toLocaleString(),
                  `Predicted consumption (${stockLabel(props.payload.stockoutRisk)})`,
                ];
              }
              return [value.toLocaleString(), "Recommended order"];
            }}
          />
          <Bar
            dataKey="consumption"
            name="consumption"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={stockColor(entry.stockoutRisk)} />
            ))}
          </Bar>
          <Bar
            dataKey="recommended"
            name="recommended"
            fill="#e0e0e0"
            radius={[0, 4, 4, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="stock-legend">
        {(["#2d7d46", "#f9a825", "#e65100", "#c62828"] as const).map((color) => (
          <span key={color} className="stock-legend-item">
            <span className="stock-legend-swatch" style={{ backgroundColor: color }} />
            <span>{stockLabel(color === "#2d7d46" ? 0.1 : color === "#f9a825" ? 0.3 : color === "#e65100" ? 0.5 : 0.8)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
