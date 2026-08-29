import { useId, useState } from "react";
import type { MaternityWaitingHome, TraditionalBirthAttendant } from "../../types";
import { Icon } from "../design/Icon";
import { RISK_HEX } from "../../design/riskScale";

interface MaternityLayerProps {
  waitingHomes: MaternityWaitingHome[];
  tbas: TraditionalBirthAttendant[];
  onSelectHome?: (home: MaternityWaitingHome) => void;
}

export function MaternityLayer({ waitingHomes, tbas, onSelectHome }: MaternityLayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"homes" | "tba">("homes");
  const panelId = useId();
  const homesTabId = `${panelId}-homes-tab`;
  const tbaTabId = `${panelId}-tba-tab`;

  const openHomes = waitingHomes.filter((h) => h.status === "open");
  const registeredTBAs = tbas.filter((t) => t.registered);

  return (
    <div className="maternity-layer">
      <button type="button" className="maternity-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
        <Icon name="Baby" size={16} />
        <span>Maternity & TBA ({openHomes.length} homes, {registeredTBAs.length} TBAs)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div id={panelId} className="maternity-panel">
          <div className="maternity-tabs" role="tablist" aria-label="Maternity information">
            <button type="button" id={homesTabId} role="tab" aria-selected={view === "homes"} aria-controls={`${panelId}-homes`} className={`mat-tab ${view === "homes" ? "mat-tab--active" : ""}`} onClick={() => setView("homes")}>
              <Icon name="House" size={14} /> Waiting Homes
            </button>
            <button type="button" id={tbaTabId} role="tab" aria-selected={view === "tba"} aria-controls={`${panelId}-tba`} className={`mat-tab ${view === "tba" ? "mat-tab--active" : ""}`} onClick={() => setView("tba")}>
              <Icon name="Person" size={14} /> TBAs
            </button>
          </div>

          {view === "homes" && (
            <div id={`${panelId}-homes`} role="tabpanel" aria-labelledby={homesTabId} className="mat-homes-list">
              {waitingHomes.length === 0 ? (
                <p className="mat-empty">No maternity waiting homes in this area.</p>
              ) : (
                waitingHomes.map((home) => {
                  const occupancyPct = home.capacity > 0 ? home.occupied / home.capacity : 0;
                  const statusColor = home.status === "open" ? RISK_HEX.low : home.status === "full" ? RISK_HEX.high : "var(--color-text-muted)";
                  return (
                    <button
                      type="button"
                      key={home.mwh_id}
                      className="mat-home-card"
                      onClick={() => onSelectHome?.(home)}
                    >
                      <div className="mat-home-header">
                        <Icon name="House" size={16} color={statusColor} />
                        <span className="mat-home-name">{home.name}</span>
                        <span className="mat-home-status" style={{ color: statusColor }}>
                          {home.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mat-home-capacity">
                        <div className="mat-capacity-bar">
                          <div className="mat-capacity-fill" style={{ transform: `scaleX(${Math.min(Math.max(occupancyPct, 0), 1)})`, backgroundColor: statusColor }} />
                        </div>
                        <span className="mat-capacity-text">{home.occupied}/{home.capacity} occupied</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {view === "tba" && (
            <div id={`${panelId}-tba`} role="tabpanel" aria-labelledby={tbaTabId} className="mat-tba-list">
              {registeredTBAs.length === 0 ? (
                <p className="mat-empty">No registered TBAs in this area.</p>
              ) : (
                registeredTBAs.map((tba) => (
                  <div key={tba.tba_id} className="mat-tba-card">
                    <div className="mat-tba-header">
                      <Icon name="Person" size={16} color="var(--color-primary)" />
                      <div className="mat-tba-info">
                        <span className="mat-tba-name">{tba.name}</span>
                        <span className="mat-tba-meta">{tba.village} · {tba.years_experience} years experience</span>
                      </div>
                    </div>
                    <p className="mat-tba-note">
                      Registered · Linked to facility
                    </p>
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
