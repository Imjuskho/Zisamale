import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchCHWPerformance, fetchCHWHouseholds } from "../store/dashboardSlice";
import { KPICard } from "../components/design/KPICard";
import { SyncIndicator } from "../components/design/SyncIndicator";
import { EmptyState } from "../components/design/EmptyState";
import { RiskBadge } from "../components/design/RiskBadge";
import { SkeletonDashboard } from "../components/design/Skeleton";
import type { Household } from "../types";

function householdRiskScore(hh: Household): number {
  let score = 0;
  if (hh.high_risk) score += 5;
  if (hh.under_five > 0) score += 2;
  if (hh.members > 6) score += 1;
  if (!hh.last_visit_at) score += 3;
  else {
    const daysSince = (Date.now() - new Date(hh.last_visit_at).getTime()) / 86_400_000;
    if (daysSince > 14) score += 2;
    else if (daysSince > 7) score += 1;
  }
  return score;
}

function formatDaysAgo(iso: string | null): string {
  if (!iso) return "Never visited";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function CHWDashboard() {
  const dispatch = useAppDispatch();
  const { chwPerformance, chwHouseholds, loading } = useAppSelector((s) => s.dashboard);
  const user = useAppSelector((s) => s.auth.user);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myPerf = useMemo(
    () => chwPerformance.find((c) => c.chw_name === user?.name) ?? chwPerformance[0],
    [chwPerformance, user]
  );

  useEffect(() => {
    dispatch(fetchCHWPerformance(user?.district));
  }, [dispatch, user?.district]);

  useEffect(() => {
    if (myPerf) dispatch(fetchCHWHouseholds(myPerf.chw_id));
  }, [dispatch, myPerf]);

  const households = useMemo(() => {
    if (!myPerf) return [];
    const raw = chwHouseholds[myPerf.chw_id] ?? myPerf.households ?? [];
    return [...raw].sort((a, b) => householdRiskScore(b) - householdRiskScore(a));
  }, [myPerf, chwHouseholds]);

  const highRisk = households.filter((h) => h.high_risk).length;
  const underFive = households.reduce((s, h) => s + h.under_five, 0);
  const completionRate = myPerf
    ? Math.round((myPerf.visits_this_week / Math.max(myPerf.expected_visits_weekly, 1)) * 100)
    : 0;

  const syncAgeH = myPerf
    ? (Date.now() - new Date(myPerf.last_sync_at).getTime()) / 3_600_000
    : Infinity;
  const syncStatus = syncAgeH > 48 ? "error" : syncAgeH > 24 ? "offline" : "synced";

  return (
    <div className="dashboard chw-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>My Dashboard</h1>
          <p>
            {user?.name || "Community Health Worker"}
            <span className="ws-status-inline">
              <SyncIndicator status={syncStatus} />
            </span>
          </p>
        </div>
      </header>

      {loading && <SkeletonDashboard />}

      <div className="kpi-row">
        <KPICard
          label="Visits This Week"
          value={myPerf ? `${myPerf.visits_this_week}/${myPerf.expected_visits_weekly}` : "—"}
          icon="ListChecks"
          iconColor="#0f7b8a"
          trend={
            completionRate >= 80
              ? { direction: "up", value: `${completionRate}%`, isPositive: true }
              : completionRate > 0
                ? { direction: "down", value: `${completionRate}%`, isPositive: false }
                : undefined
          }
        />
        <KPICard
          label="High-Risk Households"
          value={highRisk}
          icon="Warning"
          iconColor="#c62828"
          trend={highRisk > 0 ? { direction: "up", value: `${highRisk} need attention`, isPositive: false } : undefined}
        />
        <KPICard label="Children Under 5" value={underFive} icon="Baby" iconColor="#0f7b8a" />
        <KPICard label="Total Households" value={households.length} icon="House" iconColor="#2d7d46" />
      </div>

      <section className="chw-household-list">
        <h2>Households by Risk</h2>
        {households.length === 0 ? (
          <EmptyState
            title="No households assigned"
            subtitle="Your supervisor will assign households to your catchment area."
            icon="House"
            iconColor="#0f7b8a"
          />
        ) : (
          <div className="household-cards">
            {households.map((hh) => {
              const risk = householdRiskScore(hh);
              const isExpanded = expandedId === hh.household_id;
              return (
                <article
                  key={hh.household_id}
                  className={`household-card ${hh.high_risk ? "household-high-risk" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : hh.household_id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : hh.household_id);
                    }
                  }}
                >
                  <div className="household-card-header">
                    <div className="household-card-info">
                      <strong>{hh.head_of_household}</strong>
                      <span className="text-caption text-neutral">
                        {hh.members} members &middot; {hh.under_five} under 5
                      </span>
                    </div>
                    <div className="household-card-risk">
                      <RiskBadge score={risk} size="sm" />
                    </div>
                  </div>
                  <div className="household-card-meta">
                    <span className={`visit-status ${!hh.last_visit_at ? "visit-never" : ""}`}>
                      {formatDaysAgo(hh.last_visit_at)}
                    </span>
                    {hh.high_risk && <span className="high-risk-tag">High Risk</span>}
                  </div>
                  {isExpanded && (
                    <div className="household-card-details">
                      <p>Household ID: {hh.household_id}</p>
                      <p>Last visit: {hh.last_visit_at ? new Date(hh.last_visit_at).toLocaleDateString() : "Never"}</p>
                      {hh.high_risk && (
                        <p className="text-risk-critical font-semibold">
                          This household requires urgent follow-up.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
