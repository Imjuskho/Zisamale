import { useEffect, useState } from "react";
import { useAppSelector } from "../hooks/useRedux";
import { KPICard } from "../components/design/KPICard";
import { SyncIndicator } from "../components/design/SyncIndicator";

interface DistrictScore {
  district_id: string;
  name: string;
  risk: "low" | "medium" | "high";
  mmr: number;
  mmrTrend: string;
  malariaTrend: "up" | "stable" | "down";
  stockLevel: "good" | "warning" | "critical";
}

const MOCK_DISTRICTS: DistrictScore[] = [
  { district_id: "nsanje", name: "Nsanje", risk: "high", mmr: 445, mmrTrend: "↓ 2%", malariaTrend: "up", stockLevel: "critical" },
  { district_id: "neno", name: "Neno", risk: "medium", mmr: 380, mmrTrend: "↓ 12%", malariaTrend: "stable", stockLevel: "warning" },
  { district_id: "blantyre", name: "Blantyre", risk: "low", mmr: 290, mmrTrend: "↓ 5%", malariaTrend: "down", stockLevel: "good" },
  { district_id: "mzuzu", name: "Mzuzu", risk: "low", mmr: 310, mmrTrend: "↓ 3%", malariaTrend: "stable", stockLevel: "good" },
];

function riskBadgeStyle(risk: string) {
  if (risk === "high") return "bg-risk-critical-light text-risk-critical";
  if (risk === "medium") return "bg-risk-medium-light text-yellow-800";
  return "bg-risk-low-light text-risk-low";
}

function stockEmoji(level: string) {
  if (level === "critical") return "🔴";
  if (level === "warning") return "🟡";
  return "🟢";
}

function malariaArrow(trend: string) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

export function MoHPDashboard() {
  const { user } = useAppSelector((s) => s.auth);
  const [budget, setBudget] = useState(150);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline font-bold text-zisamale-dark">
            Ministry of Health — Executive Scorecard
          </h1>
          <p className="text-body text-neutral mt-1">
            Week {Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)}, {new Date().getFullYear()} • National Overview
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncIndicator status="synced" />
          <button className="btn-secondary text-sm py-2">
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card-elevated rounded-xl p-6">
        <h2 className="text-title font-semibold text-zisamale-dark mb-3">
          Executive Summary
        </h2>
        <p className="text-body text-zisamale-dark leading-relaxed">
          3 districts predicted to experience malaria outbreaks in the next 2 weeks.
          <strong className="text-risk-critical"> Nsanje requires emergency ACT resupply.</strong>
          Maternal mortality in Neno decreased 12% since AI deployment.
        </p>
        <div className="flex gap-3 mt-4">
          <button className="btn-primary text-sm py-2.5">📊 View Details</button>
          <button className="btn-secondary text-sm py-2.5">💰 Model Budget Scenario</button>
        </div>
      </div>

      {/* National KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="NATIONAL MMR" value="356" unit="per 100,000" icon="🤰" trend={{ direction: "down", value: "6% vs Q2", isPositive: true }} />
        <KPICard label="UNDER-5 MORTALITY" value="42" unit="per 1,000" icon="👶" trend={{ direction: "down", value: "3% vs Q2", isPositive: true }} />
        <KPICard label="ACTIVE CHWs" value="450" icon="👥" />
        <KPICard label="DISTRICTS AT RISK" value="3" icon="⚠️" trend={{ direction: "up", value: "from 1", isPositive: false }} />
      </div>

      {/* District Scorecard */}
      <div>
        <h2 className="text-title font-semibold text-zisamale-dark mb-4">
          District Health Scorecard
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_DISTRICTS.map((d) => (
            <div key={d.district_id} className="card rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-title font-semibold">{d.name}</h3>
                <span className={`text-label font-bold px-2 py-1 rounded-full ${riskBadgeStyle(d.risk)}`}>
                  {d.risk.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 text-body">
                <div className="flex justify-between">
                  <span className="text-neutral">MMR</span>
                  <span className="font-medium">{d.mmr} <span className="text-risk-low text-caption">{d.mmrTrend}</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral">Malaria</span>
                  <span className="font-medium">{malariaArrow(d.malariaTrend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral">Stock</span>
                  <span>{stockEmoji(d.stockLevel)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Forecasting */}
      <div className="card-elevated rounded-xl p-6">
        <h2 className="text-title font-semibold text-zisamale-dark mb-4">
          Resource Forecasting
        </h2>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption text-neutral">Budget allocation</span>
            <span className="text-title font-bold text-zisamale-green">{budget}M MWK</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-neutral-light cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zisamale-green [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-card"
          />
          <div className="flex justify-between text-label text-neutral mt-1">
            <span>0M</span>
            <span>500M MWK</span>
          </div>
        </div>

        <div className="bg-zisamale-green-light rounded-xl p-4">
          <p className="text-body font-medium text-zisamale-dark mb-2">
            If <strong>{budget}M MWK</strong> allocated to malaria commodities in Nsanje:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-data font-bold text-risk-low">{Math.round(budget * 0.43)}%</p>
              <p className="text-label text-neutral">Stockout reduction</p>
            </div>
            <div>
              <p className="text-data font-bold text-risk-low">{Math.round(budget * 0.8)}</p>
              <p className="text-label text-neutral">Lives saved</p>
            </div>
            <div>
              <p className="text-data font-bold text-zisamale-teal">${Math.round(285 * (500 / Math.max(budget, 1)))}</p>
              <p className="text-label text-neutral">Cost per DALY</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button className="btn-primary text-sm py-2.5">📋 Export to MTEF</button>
          <button className="btn-secondary text-sm py-2.5">📧 Share with Ministry of Finance</button>
        </div>
      </div>
    </div>
  );
}
