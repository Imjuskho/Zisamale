import { lazy, Suspense } from "react";
import type { CaseTrend } from "../../types";

const LazyTrendChart = lazy(() => import("./TrendChartInner"));

interface Props {
  actual: CaseTrend[];
  predicted: CaseTrend[];
  title?: string;
  height?: number;
  showThreshold?: boolean;
}

export function TrendChart(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="chart-container card" style={{ height: props.height ?? 400 }}>
          <div className="animate-pulse bg-neutral/20 rounded h-full" />
        </div>
      }
    >
      <LazyTrendChart {...props} />
    </Suspense>
  );
}
