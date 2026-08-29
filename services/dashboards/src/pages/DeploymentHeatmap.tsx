import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { DeploymentHeatmapCell } from "../types";

function getIntensityColor(count: number, max: number): string {
  if (max === 0) return "bg-stone-50";
  const ratio = count / max;
  if (ratio > 0.75) return "bg-green-200 border-green-300";
  if (ratio > 0.5) return "bg-green-100 border-green-200";
  if (ratio > 0.25) return "bg-green-50 border-green-100";
  if (ratio > 0) return "bg-stone-100 border-stone-200";
  return "bg-stone-50 border-stone-200";
}

const METHOD_LABELS: Record<string, string> = {
  home_visit: "Home",
  community_meeting: "Meeting",
  clinic: "Clinic",
  school: "School",
  radio: "Radio",
  sms: "SMS",
  poster: "Poster",
};

export function DeploymentHeatmap() {
  const [cells, setCells] = useState<DeploymentHeatmapCell[]>([]);
  const [total, setTotal] = useState(0);
  const [totalHH, setTotalHH] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"deployments" | "households">("deployments");

  useEffect(() => {
    api
      .getDeploymentHeatmap()
      .then((data) => {
        setCells(data.cells);
        setTotal(data.total_deployments);
        setTotalHH(data.total_households_reached);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxDeployments = Math.max(...cells.map((c) => c.deployment_count), 1);
  const sorted = [...cells].sort((a, b) =>
    sortBy === "deployments"
      ? b.deployment_count - a.deployment_count
      : b.households_reached - a.households_reached
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-parchment rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-parchment rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Deployment Heatmap
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Knowledge asset deployment density by district
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-apple-blue">{total}</div>
          <div className="text-xs text-stone-500">Total Deployments</div>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-green-600">
            {totalHH.toLocaleString()}
          </div>
          <div className="text-xs text-stone-500">Households Reached</div>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-apple-gray600">{cells.length}</div>
          <div className="text-xs text-stone-500">Districts Active</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-500">Sort by:</span>
        <button
          onClick={() => setSortBy("deployments")}
          aria-pressed={sortBy === "deployments"}
          className={`text-sm px-3 py-1 rounded-full ${
            sortBy === "deployments"
              ? "bg-apple-blue text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Deployments
        </button>
        <button
          onClick={() => setSortBy("households")}
          aria-pressed={sortBy === "households"}
          className={`text-sm px-3 py-1 rounded-full ${
            sortBy === "households"
              ? "bg-apple-blue text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Households
        </button>
      </div>

      {cells.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          No deployment data yet. Deploy assets to see the heatmap.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((cell) => (
            <div
              key={cell.district_id || "unknown"}
              className={`rounded-lg border p-4 transition-shadow hover:shadow-md ${getIntensityColor(
                cell.deployment_count,
                maxDeployments
              )}`}
            >
              <div className="font-display font-bold text-apple-blue truncate">
                {cell.district_name || cell.district_id || "Unknown"}
              </div>
              <div className="font-display text-2xl font-bold text-apple-blue mt-1">
                {cell.deployment_count}
              </div>
              <div className="text-xs text-stone-500">deployments</div>
              <div className="text-sm text-green-700 mt-1">
                {cell.households_reached.toLocaleString()} households
              </div>
              {Object.keys(cell.delivery_methods).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(cell.delivery_methods).map(([method, count]) => (
                    <span
                      key={method}
                      className="text-[10px] bg-white/70 rounded-full px-1.5 py-0.5 font-display"
                    >
                      {METHOD_LABELS[method] || method}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-stone-400">
        <span>Intensity:</span>
        <span className="w-4 h-4 rounded bg-stone-50 border border-stone-200" />
        <span>None</span>
        <span className="w-4 h-4 rounded bg-green-50 border border-green-100" />
        <span>Low</span>
        <span className="w-4 h-4 rounded bg-green-100 border border-green-200" />
        <span>Medium</span>
        <span className="w-4 h-4 rounded bg-green-200 border border-green-300" />
        <span>High</span>
      </div>
    </div>
  );
}
