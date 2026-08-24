import type { Facility, FacilityBed, FacilityStock, FacilityStaff, RoadCondition } from "../../types";
import { Icon } from "../design/Icon";

interface FacilityPanelProps {
  facility: Facility;
  onClose: () => void;
  onRefer?: (facility: Facility) => void;
  onCall?: (facility: Facility) => void;
}

function BedCounter({ bed }: { bed: FacilityBed }) {
  const ratio = bed.available / bed.total;
  const color = ratio > 0.5 ? "#2d7d46" : ratio > 0.2 ? "#e65100" : "#c62828";
  return (
    <div className="facility-bed-counter">
      <span className="facility-bed-ward">{bed.ward}</span>
      <span className="facility-bed-numbers" style={{ color }}>
        {bed.available}<span className="facility-bed-total">/{bed.total}</span>
      </span>
      <div className="facility-bed-bar">
        <div className="facility-bed-bar-fill" style={{ width: `${((bed.total - bed.available) / bed.total) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StockBar({ item }: { item: FacilityStock }) {
  const color = item.status === "good" ? "#2d7d46" : item.status === "amber" ? "#e65100" : "#c62828";
  return (
    <div className="facility-stock-row">
      <span className="facility-stock-name">{item.commodity}</span>
      <div className="facility-stock-bar">
        <div className="facility-stock-bar-fill" style={{ width: `${item.level * 100}%`, backgroundColor: color }} />
      </div>
      <span className="facility-stock-pct" style={{ color }}>{Math.round(item.level * 100)}%</span>
    </div>
  );
}

function StaffChip({ staff }: { staff: FacilityStaff }) {
  const statusColor = staff.status === "present" ? "#2d7d46" : staff.status === "on_break" ? "#e65100" : "#999";
  const statusLabel = staff.status === "present" ? "On duty" : staff.status === "on_break" ? "On break" : "Absent";
  return (
    <div className="facility-staff-chip">
      <span className="facility-staff-dot" style={{ backgroundColor: statusColor }} />
      <div>
        <span className="facility-staff-name">{staff.name || "—"}</span>
        <span className="facility-staff-role">{staff.role}</span>
      </div>
      <span className="facility-staff-status" style={{ color: statusColor }}>{statusLabel}</span>
    </div>
  );
}

function RoadStatus({ road }: { road: RoadCondition }) {
  const config: Record<string, { color: string; icon: string }> = {
    passable: { color: "#2d7d46", icon: "CheckCircle" },
    flooded: { color: "#c62828", icon: "XCircle" },
    "4wd_only": { color: "#e65100", icon: "Warning" },
    blocked: { color: "#c62828", icon: "XCircle" },
  };
  const c = config[road.status] ?? config.passable;
  return (
    <div className="facility-road-row">
      <Icon name={c.icon as any} size={16} color={c.color} />
      <span className="facility-road-route">{road.route}</span>
      <span className="facility-road-status" style={{ color: c.color }}>
        {road.status.replace("_", " ")}
      </span>
      {road.note && <span className="facility-road-note">{road.note}</span>}
    </div>
  );
}

export function FacilityPanel({ facility, onClose, onRefer, onCall }: FacilityPanelProps) {
  const totalBeds = facility.beds.reduce((s, b) => s + b.available, 0);
  const totalCapacity = facility.beds.reduce((s, b) => s + b.total, 0);
  const criticalStock = facility.stock.filter((s) => s.status === "critical");

  return (
    <div className="facility-panel" role="dialog" aria-label={`${facility.name} details`}>
      <div className="facility-panel-header">
        <Icon name="Hospital" size={24} color="#1e40af" />
        <div className="facility-panel-title">
          <h2>{facility.name}</h2>
          <span className="facility-panel-type">{facility.facility_type.replace(/_/g, " ")}</span>
        </div>
        <button className="facility-panel-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Bed status */}
      <section className="facility-section">
        <h3><Icon name="Hospital" size={16} /> Bed Availability</h3>
        <div className="facility-bed-summary">
          <span className="facility-bed-total-big" style={{ color: totalBeds > 10 ? "#2d7d46" : totalBeds > 3 ? "#e65100" : "#c62828" }}>
            {totalBeds}
          </span>
          <span className="facility-bed-total-label">beds free of {totalCapacity}</span>
        </div>
        <div className="facility-bed-grid">
          {facility.beds.map((bed) => (
            <BedCounter key={bed.ward} bed={bed} />
          ))}
        </div>
      </section>

      {/* Stock status */}
      <section className="facility-section">
        <h3><Icon name="Package" size={16} /> Critical Stock</h3>
        {criticalStock.length > 0 && (
          <div className="facility-stock-alert">
            <Icon name="Warning" size={14} color="#c62828" />
            {criticalStock.length} commodity at critical level
          </div>
        )}
        {facility.stock.map((item) => (
          <StockBar key={item.commodity} item={item} />
        ))}
      </section>

      {/* Staff on duty */}
      <section className="facility-section">
        <h3><Icon name="Users" size={16} /> Staff on Duty</h3>
        {facility.staff.map((staff, i) => (
          <StaffChip key={`${staff.role}-${i}`} staff={staff} />
        ))}
      </section>

      {/* Road access */}
      <section className="facility-section">
        <h3><Icon name="MapPin" size={16} /> Access</h3>
        {facility.roads.map((road) => (
          <RoadStatus key={road.route} road={road} />
        ))}
      </section>

      {/* Actions */}
      <div className="facility-panel-actions">
        {facility.phone && (
          <button className="btn-primary facility-action-btn" onClick={() => onCall?.(facility)}>
            <Icon name="Globe" size={16} />
            Call {facility.name}
          </button>
        )}
        <button className="btn-primary facility-action-btn" onClick={() => onRefer?.(facility)}>
          <Icon name="ArrowRight" size={16} />
          Refer Patient Here
        </button>
      </div>

      <div className="facility-panel-updated">
        Updated {new Date(facility.last_updated).toLocaleString()}
      </div>
    </div>
  );
}
