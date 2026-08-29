import { useState } from "react";
import type { SupplyTruck } from "../../types";
import { Icon } from "../design/Icon";
import { RISK_HEX } from "../../design/riskScale";

interface SupplyChainLayerProps {
  trucks: SupplyTruck[];
}

export function SupplyChainLayer({ trucks }: SupplyChainLayerProps) {
  const [expanded, setExpanded] = useState(false);

  const activeTrucks = trucks.filter((t) => t.eta_hours > 0);
  const breachTrucks = trucks.filter((t) => t.temperature_breach);

  return (
    <div className="supply-chain-layer">
      <button type="button" className="supply-chain-toggle" aria-expanded={expanded} aria-controls="supply-chain-panel" onClick={() => setExpanded(!expanded)}>
        <Icon name="Truck" size={16} />
        <span>Supply Chain ({activeTrucks.length} in transit)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div id="supply-chain-panel" className="supply-chain-panel">
          {breachTrucks.length > 0 && (
            <div className="supply-alert">
              <Icon name="Warning" size={14} color={RISK_HEX.critical} />
              {breachTrucks.length} truck(s) with temperature breach
            </div>
          )}

          {activeTrucks.length === 0 ? (
            <p className="supply-empty">No trucks currently in transit.</p>
          ) : (
            <div className="supply-truck-list">
              {activeTrucks.map((truck) => (
                <div key={truck.truck_id} className={`supply-truck-card ${truck.temperature_breach ? "supply-truck-card--breach" : ""}`}>
                  <div className="supply-truck-header">
                    <Icon
                      name="Truck"
                      size={16}
                      color={truck.temperature_breach ? RISK_HEX.critical : RISK_HEX.low}
                    />
                    <div className="supply-truck-info">
                      <span className="supply-truck-driver">{truck.driver_name}</span>
                      <span className="supply-truck-dest">
                        → {truck.destination} · {truck.eta_hours}h ETA
                      </span>
                    </div>
                  </div>
                  <div className="supply-truck-cargo">
                    <Icon name="Package" size={12} /> {truck.cargo}
                  </div>
                  {truck.temperature_breach && (
                    <div className="supply-truck-breach">
                      <Icon name="Warning" size={12} color={RISK_HEX.critical} />
                      Temperature breach detected
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
