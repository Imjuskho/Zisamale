import { useState } from "react";
import type { Village, ColdChainFacility, OutreachRoute } from "../../types";
import { Icon } from "../design/Icon";

interface ImmunizationLayerProps {
  villages: Village[];
  coldChain: ColdChainFacility[];
  outreachRoutes?: OutreachRoute[];
  onSelectVillage?: (village: Village) => void;
}

function coverageColor(rate: number): string {
  if (rate >= 0.8) return "#2d7d46";
  if (rate >= 0.5) return "#f9a825";
  return "#c62828";
}

function dotSize(pop: number): number {
  if (pop > 500) return 18;
  if (pop > 200) return 14;
  if (pop > 50) return 10;
  return 8;
}

export function ImmunizationLayer({ villages, coldChain, outreachRoutes, onSelectVillage }: ImmunizationLayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"villages" | "cold_chain" | "outreach">("villages");

  const criticalVillages = villages.filter((v) => v.dpt3_coverage < 0.5);
  const totalUnvaccinated = villages.reduce((s, v) => s + Math.round(v.under5_population * (1 - v.dpt3_coverage)), 0);
  const brokenFridges = coldChain.filter((c) => c.fridge_status === "broken");

  return (
    <div className="immunization-layer">
      <button className="immunization-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Syringe" size={16} />
        <span>Immunization ({criticalVillages.length} critical)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="immunization-panel">
          <div className="immunization-tabs">
            <button className={`imm-tab ${view === "villages" ? "imm-tab--active" : ""}`} onClick={() => setView("villages")}>
              <Icon name="MapPin" size={14} /> Villages
            </button>
            <button className={`imm-tab ${view === "cold_chain" ? "imm-tab--active" : ""}`} onClick={() => setView("cold_chain")}>
              <Icon name="Package" size={14} /> Cold Chain
            </button>
            <button className={`imm-tab ${view === "outreach" ? "imm-tab--active" : ""}`} onClick={() => setView("outreach")}>
              <Icon name="Path" size={14} /> Outreach
            </button>
          </div>

          {view === "villages" && (
            <div className="imm-villages">
              <div className="imm-summary">
                <span className="imm-stat">{totalUnvaccinated}</span>
                <span className="imm-stat-label">unvaccinated children</span>
              </div>
              <p className="imm-note">Dot size = under-5 population. Color = DPT3 coverage.</p>
              <div className="imm-village-list">
                {villages.sort((a, b) => a.dpt3_coverage - b.dpt3_coverage).slice(0, 20).map((v) => (
                  <button
                    key={v.village_id}
                    className="imm-village-row"
                    onClick={() => onSelectVillage?.(v)}
                  >
                    <span className="imm-village-dot" style={{ backgroundColor: coverageColor(v.dpt3_coverage), width: dotSize(v.under5_population), height: dotSize(v.under5_population) }} />
                    <span className="imm-village-name">{v.name}</span>
                    <span className="imm-village-ta">{v.ta_name}</span>
                    <span className="imm-village-rate" style={{ color: coverageColor(v.dpt3_coverage) }}>
                      DPT3: {Math.round(v.dpt3_coverage * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "cold_chain" && (
            <div className="imm-cold-chain">
              {brokenFridges.length > 0 && (
                <div className="imm-stock-alert">
                  <Icon name="Warning" size={14} color="#c62828" />
                  {brokenFridges.length} refrigerator(s) broken
                </div>
              )}
              {coldChain.map((cc) => (
                <div key={cc.facility_id} className="imm-cold-row">
                  <Icon
                    name={cc.fridge_status === "working" ? "CheckCircle" : cc.fridge_status === "broken" ? "XCircle" : "WarningCircle"}
                    size={16}
                    color={cc.fridge_status === "working" ? "#2d7d46" : cc.fridge_status === "broken" ? "#c62828" : "#999"}
                  />
                  <span className="imm-cold-name">{cc.name}</span>
                  <span className="imm-cold-status">
                    {cc.fridge_status === "working" ? `${cc.last_temperature ?? "?"}°C` : cc.fridge_status}
                  </span>
                  {cc.solar_powered && <Icon name="Sun" size={12} color="#f9a825" />}
                </div>
              ))}
            </div>
          )}

          {view === "outreach" && outreachRoutes && (
            <div className="imm-outreach">
              {outreachRoutes.length === 0 ? (
                <p className="imm-empty">No outreach routes generated. Run the optimizer first.</p>
              ) : (
                outreachRoutes.map((route) => (
                  <div key={route.route_id} className="imm-route-card">
                    <strong>{route.label}</strong>
                    <span className="imm-route-meta">
                      {route.stops.length} stops · {route.total_unvaccinated} children · ~{route.estimated_hours}h
                    </span>
                    <div className="imm-route-stops">
                      {route.stops.map((stop, i) => (
                        <span key={i} className="imm-route-stop">
                          {i + 1}. {stop.village_name} ({stop.unvaccinated_count})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
