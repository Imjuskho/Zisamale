import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "../services/api";
import { Icon } from "../components/design/Icon";
import type { ImpactTrajectoryPoint } from "../types";

export function ImpactTrajectory() {
  const [trajectory, setTrajectory] = useState<ImpactTrajectoryPoint[]>([]);
  const [avgChange, setAvgChange] = useState(0);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getImpactTrajectory()
      .then((data) => {
        setTrajectory(data.trajectory);
        setAvgChange(data.avg_knowledge_change);
        setTotalAssessments(data.total_assessments);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const lineData = trajectory.map((t, i) => ({
    name: t.deployed_at
      ? new Date(t.deployed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      : `#${i + 1}`,
    "Pre-Score": t.pre_score,
    "Post-Score": t.post_score,
  }));

  const deltaData = trajectory.map((t, i) => ({
    name: t.deployed_at
      ? new Date(t.deployed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      : `#${i + 1}`,
    delta: t.delta,
    fill: t.delta >= 0 ? "#34c759" : "#ff3b30",
  }));

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-parchment rounded animate-pulse" />
        <div className="h-64 bg-parchment rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Impact Trajectory
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Knowledge score changes from pre-assessment to post-deployment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-green-600">
            {avgChange > 0 ? "+" : ""}{avgChange.toFixed(2)}
          </div>
          <div className="text-xs text-stone-500">Avg Knowledge Change</div>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-apple-blue">{totalAssessments}</div>
          <div className="text-xs text-stone-500">Total Assessments</div>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
          <div className="font-display text-3xl font-bold text-apple-gray600">
            {trajectory.filter((t) => t.delta > 0).length}
          </div>
          <div className="text-xs text-stone-500">Positive Outcomes</div>
        </div>
      </div>

      {trajectory.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-12 text-center">
          <div className="mb-3"><Icon name="ChartBar" size={40} color="#8e8e93" weight="light" /></div>
          <div className="text-stone-500 font-medium">No assessment data yet</div>
          <div className="text-sm text-stone-400 mt-1">
            Deploy assets and record pre/post knowledge scores to see impact trends
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="font-display font-bold text-apple-blue mb-4">
              Pre vs Post Knowledge Scores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e8e8ed",
                    borderRadius: "8px",
                    fontFamily: "'SF Pro Text', 'Inter', system-ui, sans-serif",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Pre-Score"
                  stroke="#ff3b30"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Post-Score"
                  stroke="#34c759"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="font-display font-bold text-apple-blue mb-4">
              Knowledge Improvement per Assessment
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deltaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e8e8ed",
                    borderRadius: "8px",
                    fontFamily: "'SF Pro Text', 'Inter', system-ui, sans-serif",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={0} stroke="#999" />
                <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                  {deltaData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
