import { lazy, Suspense } from "react";
import type { CommodityForecast } from "../../types";

const LazyInner = lazy(() => import("./CommodityForecastChartInner"));

interface Props {
  commodities: CommodityForecast[];
}

export function CommodityForecastChart({ commodities }: Props) {
  return (
    <Suspense
      fallback={
        <div className="commodity-forecast card" style={{ height: 350 }}>
          <div className="animate-pulse bg-neutral/20 rounded h-full" />
        </div>
      }
    >
      <LazyInner commodities={commodities} />
    </Suspense>
  );
}
