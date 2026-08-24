import { lazy, Suspense } from "react";
import type { CommodityForecast } from "../../../types";

const LazyStockLevelChart = lazy(() => import("./StockLevelChartInner"));

interface StockLevelChartProps {
  commodities: CommodityForecast[];
  height?: number;
}

export function StockLevelChart({ commodities, height = 350 }: StockLevelChartProps) {
  return (
    <Suspense
      fallback={
        <div className="chart-container card" style={{ height }}>
          <div className="animate-pulse bg-neutral/20 rounded h-full" />
        </div>
      }
    >
      <LazyStockLevelChart commodities={commodities} height={height} />
    </Suspense>
  );
}
