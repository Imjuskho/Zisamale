interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

function Skeleton({ className = "", width, height, rounded = true }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded ? "skeleton-rounded" : ""} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonKPI() {
  return (
    <div className="skeleton-kpi card" aria-busy="true" aria-label="Loading KPI data">
      <Skeleton width="40%" height={12} />
      <Skeleton width="60%" height={32} className="skeleton-mt" />
      <Skeleton width="30%" height={12} className="skeleton-mt" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card card" aria-busy="true" aria-label="Loading content">
      <Skeleton width="70%" height={18} />
      <Skeleton width="100%" height={14} className="skeleton-mt" />
      <Skeleton width="85%" height={14} className="skeleton-mt-sm" />
      <Skeleton width="50%" height={14} className="skeleton-mt-sm" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading table data">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="80%" height={14} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? "60%" : "40%"} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart card" aria-busy="true" aria-label="Loading chart data">
      <Skeleton width="50%" height={18} />
      <div className="skeleton-chart-area">
        <Skeleton width="100%" height="100%" rounded={false} />
      </div>
    </div>
  );
}

export function SkeletonAlert() {
  return (
    <div className="skeleton-alert card" aria-busy="true" aria-label="Loading alerts">
      <div className="skeleton-alert-header">
        <Skeleton width={36} height={36} />
        <div className="skeleton-alert-text">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} className="skeleton-mt-sm" />
        </div>
      </div>
      <div className="skeleton-alert-actions">
        <Skeleton width={80} height={36} />
        <Skeleton width={80} height={36} />
      </div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="skeleton-map card" aria-busy="true" aria-label="Loading map">
      <Skeleton width="40%" height={18} />
      <div className="skeleton-map-area">
        <Skeleton width="100%" height="100%" rounded={false} />
      </div>
    </div>
  );
}

/** Full page skeleton for initial load — matches DHO dashboard layout */
export function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard" role="status" aria-label="Loading dashboard">
      <div className="skeleton-dashboard-header">
        <Skeleton width="35%" height={28} />
        <Skeleton width="25%" height={14} className="skeleton-mt-sm" />
      </div>
      <div className="kpi-row">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <SkeletonAlert />
      <SkeletonMap />
      <SkeletonChart />
      <SkeletonTable />
    </div>
  );
}
