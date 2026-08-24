import { useState } from "react";
import type { CHWPerformance, Household } from "../types";
import { EmptyState } from "./design/EmptyState";

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-testable)                                        */
/* ------------------------------------------------------------------ */

export function syncAgeHours(lastSyncIso: string, now: Date = new Date()): number {
  const t = new Date(lastSyncIso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - t) / 3_600_000;
}

export function visitCompletionRate(
  row: Pick<CHWPerformance, "visits_this_week" | "expected_visits_weekly">
): number {
  if (!row.expected_visits_weekly || row.expected_visits_weekly <= 0) return 1;
  return row.visits_this_week / row.expected_visits_weekly;
}

export function syncStatus(ageHours: number): {
  label: string;
  tone: "ok" | "warn" | "stale";
} {
  if (ageHours > 48) return { label: "STALE", tone: "stale" };
  if (ageHours > 24) return { label: "DELAYED", tone: "warn" };
  return { label: "SYNCED", tone: "ok" };
}

const TONE_COLORS = {
  ok: "#15803d",
  warn: "#c2410c",
  stale: "#b91c1c",
} as const;

function formatLastVisit(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface CHWPerformanceTableProps {
  rows: CHWPerformance[];
  /** Households keyed by chw_id (e.g. fetched on drill-down). */
  householdsByChw?: Record<string, Household[]>;
  /** Called the first time a CHW row is expanded and no households are cached. */
  onLoadHouseholds?: (chwId: string) => void;
  now?: Date;
}

export function CHWPerformanceTable({
  rows,
  householdsByChw,
  onLoadHouseholds,
  now = new Date(),
}: CHWPerformanceTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleRow(chw: CHWPerformance) {
    if (expandedId === chw.chw_id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(chw.chw_id);
    const cached = householdsByChw?.[chw.chw_id] ?? chw.households;
    if (!cached && onLoadHouseholds) onLoadHouseholds(chw.chw_id);
  }

  if (rows.length === 0) {
    return (
      <div className="chw-performance">
        <h2>CHW Performance</h2>
        <EmptyState
          title="No community health worker data available"
          subtitle="Data will appear here once CHWs sync their reports."
          icon="Users"
          iconColor="#0f7b8a"
        />
      </div>
    );
  }

  return (
    <div className="chw-performance">
      <h2>CHW Performance</h2>
      <table className="data-table chw-table" role="table">
        <thead>
          <tr>
            <th scope="col">CHW</th>
            <th scope="col">Catchment Pop.</th>
            <th scope="col">Visits This Week</th>
            <th scope="col">High-Risk Cases</th>
            <th scope="col">Referrals</th>
            <th scope="col">Sync Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((chw) => {
            const age = syncAgeHours(chw.last_sync_at, now);
            const completion = visitCompletionRate(chw);
            const status = syncStatus(age);
            const rowTone =
              status.tone === "stale"
                ? "sync-stale"
                : completion < 0.5
                  ? "visits-low"
                  : "";
            const isExpanded = expandedId === chw.chw_id;
            const households =
              householdsByChw?.[chw.chw_id] ?? chw.households ?? [];
            return (
              <FragmentRow
                key={chw.chw_id}
                chw={chw}
                age={age}
                completion={completion}
                status={status}
                rowTone={rowTone}
                isExpanded={isExpanded}
                households={households}
                isLoading={
                  isExpanded && households.length === 0 && !!onLoadHouseholds
                }
                onToggle={() => toggleRow(chw)}
              />
            );
          })}
        </tbody>
      </table>
      <p className="chw-legend">
        Red background: sync older than 48h &middot; Yellow background: under 50% visit
        completion &middot; Click a row for household drill-down.
      </p>
    </div>
  );
}

function FragmentRow({
  chw,
  age,
  completion,
  status,
  rowTone,
  isExpanded,
  households,
  isLoading,
  onToggle,
}: {
  chw: CHWPerformance;
  age: number;
  completion: number;
  status: { label: string; tone: "ok" | "warn" | "stale" };
  rowTone: string;
  isExpanded: boolean;
  households: Household[];
  isLoading: boolean;
  onToggle: () => void;
}) {
  const ageLabel = Number.isFinite(age) ? `${Math.floor(age)}h ago` : "unknown";
  return (
    <>
      <tr
        className={`chw-row ${rowTone}`}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
        aria-expanded={isExpanded}
      >
        <td className="chw-name">{chw.chw_name}</td>
        <td>{chw.catchment_population.toLocaleString()}</td>
        <td>
          {chw.visits_this_week}/{chw.expected_visits_weekly} (
          {Math.round(completion * 100)}%)
        </td>
        <td>{chw.high_risk_cases}</td>
        <td>{chw.referrals_open}</td>
        <td>
          <span
            className={`sync-badge sync-${status.tone}`}
            style={{
              backgroundColor: TONE_COLORS[status.tone],
              color: "#fff",
              borderRadius: 4,
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {status.label}
          </span>{" "}
          <span className="sync-age">{ageLabel}</span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="chw-households-row">
          <td colSpan={6}>
            {isLoading ? (
              <em>Loading households&hellip;</em>
            ) : households.length === 0 ? (
              <em>No household records available.</em>
            ) : (
              <table className="household-table" role="table">
                <caption>Households in {chw.chw_name}&rsquo;s catchment</caption>
                <thead>
                  <tr>
                    <th scope="col">Head of Household</th>
                    <th scope="col">Members</th>
                    <th scope="col">Under 5</th>
                    <th scope="col">High Risk</th>
                    <th scope="col">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((hh) => (
                    <tr key={hh.household_id}>
                      <td>{hh.head_of_household}</td>
                      <td>{hh.members}</td>
                      <td>{hh.under_five}</td>
                      <td>{hh.high_risk ? "Yes" : "No"}</td>
                      <td>{formatLastVisit(hh.last_visit_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
