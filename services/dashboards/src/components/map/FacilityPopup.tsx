/**
 * FACILITY POPUP — Rich popup content for real facility markers
 *
 * Shows: name, type badge, district, bed bar, services, CHW verification.
 * Rendered as a React component inside the react-leaflet <Popup>, so the
 * action buttons call their callbacks directly instead of going through
 * a window-event bus.
 */
import type { Facility } from "../../services/facilityService";
import { FACILITY_CONFIG } from "../../services/facilityService";
import {
  bedBarColor,
  facilityStatusColor as statusColor,
} from "../../design/riskScale";
import { humanize } from "../../utils/text";

export function FacilityPopup({
  facility,
  onRefer,
  onViewDetails,
}: {
  facility: Facility;
  onRefer: (facility: Facility) => void;
  onViewDetails: (facility: Facility) => void;
}) {
  const config = FACILITY_CONFIG[facility.type];
  const statusCol = statusColor(facility.operational_status);
  const bedsTotal = facility.beds_total ?? 0;
  const bedsAvailable = facility.beds_available;

  return (
    <div style={{ minWidth: 240, maxWidth: 300, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: config.color,
            border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {config.label}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, color: "var(--color-text,#1a1a2e)" }}>
            {facility.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted,#666)", marginTop: 2 }}>
            {facility.district}
            {facility.traditional_authority ? ` \u2022 ${facility.traditional_authority}` : ""}
          </div>
          <div style={{ fontSize: 11, color: statusCol, fontWeight: 500, marginTop: 1 }}>
            {facility.operational_status ?? "Unverified"}
          </div>
        </div>
      </div>

      {bedsTotal > 0 && (
        <div style={{ margin: "8px 0", padding: "6px 8px", background: "var(--color-bg-muted,#f5f5f0)", borderRadius: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: "var(--color-text-muted,#666)" }}>Bed Availability</span>
            <span style={{ fontWeight: 600, color: bedBarColor(bedsAvailable ?? 0, bedsTotal) }}>
              {bedsAvailable ?? "?"}/{bedsTotal}
            </span>
          </div>
          <div style={{ width: "100%", height: 6, background: "var(--color-border,#e0e0e0)", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${((bedsAvailable ?? 0) / bedsTotal) * 100}%`,
                background: bedBarColor(bedsAvailable ?? 0, bedsTotal),
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      )}

      {facility.services.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, margin: "6px 0" }}>
          {facility.services.map((s) => (
            <span
              key={s}
              style={{
                padding: "2px 6px",
                background: "var(--color-bg-muted,#eee)",
                color: "var(--color-text,#333)",
                fontSize: 10,
                borderRadius: 10,
              }}
            >
              {humanize(s)}
            </span>
          ))}
        </div>
      )}

      {facility.chw_verified ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#2D6A4F", marginTop: 6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Verified by {facility.chw_verified_by} on {facility.chw_verified_date}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "#ff9500", marginTop: 6 }}>
          Location not yet verified by field staff
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onRefer(facility)}
          style={{ flex: 1, padding: "6px 0", background: "#2D6A4F", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
        >
          Refer patient
        </button>
        <button
          type="button"
          onClick={() => onViewDetails(facility)}
          style={{ flex: 1, padding: "6px 0", background: "transparent", color: "var(--color-text,#333)", border: "1px solid var(--color-border,#ddd)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
        >
          View details
        </button>
      </div>
    </div>
  );
}
