import { useMemo, useState } from "react";
import type { CHWPerformance } from "../../types";
import { Icon } from "../design/Icon";
import { RISK_HEX } from "../../design/riskScale";
import { isOlderThan } from "../../utils/recency";

interface CHWCoverageHeatmapProps {
  chws: CHWPerformance[];
}

export function CHWCoverageHeatmap({ chws }: CHWCoverageHeatmapProps) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const total = chws.length;
    const onTrack = chws.filter((c) => c.visits_this_week >= c.expected_visits_weekly * 0.8).length;
    const overdue = chws.filter((c) => isOlderThan(c.last_sync_at, 48)).length;
    const coveragePct = total > 0 ? Math.round((onTrack / total) * 100) : 0;
    return { total, onTrack, overdue, coveragePct };
  }, [chws]);

  if (chws.length === 0) return null;

  return (
    <div className="chw-coverage-heatmap">
      <button type="button" className="chw-coverage-toggle" aria-expanded={expanded} aria-controls="chw-coverage-panel" onClick={() => setExpanded(!expanded)}>
        <Icon name="ChartBar" size={16} />
        <span>Coverage Heatmap ({stats.coveragePct}% on track)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div id="chw-coverage-panel" className="chw-coverage-panel">
          <div className="chw-coverage-summary">
            <div className="chw-coverage-stat">
              <span className="chw-coverage-num" style={{ color: RISK_HEX.low }}>{stats.onTrack}</span>
              <span className="chw-coverage-label">On track</span>
            </div>
            <div className="chw-coverage-stat">
              <span className="chw-coverage-num" style={{ color: RISK_HEX.high }}>{stats.total - stats.onTrack - stats.overdue}</span>
              <span className="chw-coverage-label">Behind</span>
            </div>
            <div className="chw-coverage-stat">
              <span className="chw-coverage-num" style={{ color: RISK_HEX.critical }}>{stats.overdue}</span>
              <span className="chw-coverage-label">Stale (&gt;48h)</span>
            </div>
          </div>

          <div className="chw-coverage-grid">
            {chws.map((chw) => {
              const completion = chw.expected_visits_weekly > 0
                ? chw.visits_this_week / chw.expected_visits_weekly
                : 1;
              const color = completion >= 0.8 ? RISK_HEX.low : completion >= 0.5 ? RISK_HEX.medium : RISK_HEX.critical;
              const isStale = isOlderThan(chw.last_sync_at, 48);

              return (
                <div
                  key={chw.chw_id}
                  className={`chw-heat-cell ${isStale ? "chw-heat-cell--stale" : ""}`}
                  title={`${chw.chw_name}: ${Math.round(completion * 100)}% visits, ${isStale ? "STALE" : "synced"}`}
                >
                  <div className="chw-heat-bar" style={{ height: `${Math.min(completion * 100, 100)}%`, backgroundColor: color }} />
                  <span className="chw-heat-name">{chw.chw_name.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>

          <p className="chw-coverage-note">
            Bar height = visit completion %. Color: green ≥80%, yellow ≥50%, red &lt;50%. Red border = stale sync.
          </p>
        </div>
      )}
    </div>
  );
}
