/**
 * FACILITY MARKER ICONS — Leaflet DivIcon factories
 *
 * Two icon variants:
 *   createFacilityIcon()   — rich card with type badge + bed count + staff
 *   createSimpleFacilityIcon() — compact teardrop pin (for clusters)
 *
 * Both support the real Malawi facility data from facilityService.ts.
 */
import L from "leaflet";
import type { Facility } from "../../services/facilityService";
import { FACILITY_CONFIG, STATUS_CONFIG } from "../../services/facilityService";

/* ── Rich card icon (expanded view) ─────────────────────────────── */

function topStatusLabel(facility: Facility): string {
  if (facility.beds_total != null && facility.beds_available != null) {
    if (facility.beds_available < 3) return "CRITICAL";
    if (facility.beds_available < facility.beds_total * 0.3) return "LOW";
  }
  if (facility.operational_status === "Partial") return "PARTIAL";
  if (facility.operational_status === "Closed" || facility.operational_status === "Not Functional") return "DOWN";
  return "OK";
}

function topStatusColor(facility: Facility): string {
  const label = topStatusLabel(facility);
  if (label === "CRITICAL") return "#C62828";
  if (label === "LOW" || label === "PARTIAL") return "#E65100";
  if (label === "DOWN") return "#999";
  return "#2D7D46";
}

export function createFacilityIcon(facility: Facility): L.DivIcon {
  const config = FACILITY_CONFIG[facility.type];
  const status = (facility.operational_status && STATUS_CONFIG[facility.operational_status]) || STATUS_CONFIG.Functional;
  const statusLabel = topStatusLabel(facility);
  const statusColor = topStatusColor(facility);
  const bedText =
    facility.beds_total != null
      ? `${facility.beds_available ?? "?"}/${facility.beds_total}`
      : null;

  const html = `
    <div style="
      display:flex;align-items:center;gap:6px;
      background:var(--color-surface,#fff);
      border:1px solid var(--color-border,#e0e0e0);
      border-left:3px solid ${config.color};
      border-radius:6px;
      padding:4px 8px;
      box-shadow:0 2px 8px rgba(0,0,0,0.12);
      cursor:pointer;
      white-space:nowrap;
      opacity:${status.opacity};
      transition:transform 0.15s,box-shadow 0.15s;
    ">
      <div style="
        width:24px;height:24px;border-radius:50%;
        background:${config.color};
        border:2px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,0.2);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:9px;font-weight:700;font-family:Inter,sans-serif;
        flex-shrink:0;
      ">${config.label}</div>
      <div style="min-width:0;">
        <div style="font-size:10px;font-weight:600;color:var(--color-text,#1a1a2e);line-height:1.2;max-width:100px;overflow:hidden;text-overflow:ellipsis;">${facility.name}</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:9px;">
          ${bedText ? `<span style="color:${statusColor};font-weight:600;">${bedText} beds</span>` : ""}
          <span style="color:${statusColor};font-weight:500;">${statusLabel}</span>
          ${facility.chw_verified ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="#2D7D46" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>` : ""}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [180, 44],
    iconAnchor: [12, 22],
    popupAnchor: [6, -10],
  });
}

/* ── Compact teardrop pin (default / clustered view) ─────────────── */

export function createSimpleFacilityIcon(
  facility: Facility,
  opts?: { className?: string }
): L.DivIcon {
  const config = FACILITY_CONFIG[facility.type];
  const status = (facility.operational_status && STATUS_CONFIG[facility.operational_status]) || STATUS_CONFIG.Functional;
  const size = config.size;

  const bedAlert =
    facility.beds_total != null &&
    facility.beds_available != null &&
    facility.beds_available < 3;

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;opacity:${status.opacity};">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${config.color}" stroke="#fff" stroke-width="${config.strokeWidth}"/>
        <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="8" font-weight="700" font-family="Inter,sans-serif">${config.label}</text>
      </svg>
      ${bedAlert ? `<div style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#C62828;border-radius:50%;border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>` : ""}
      ${facility.chw_verified ? `<div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background:#2D7D46;border-radius:50%;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;"><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></div>` : ""}
    </div>
  `;

  return L.divIcon({
    html,
    className: opts?.className ?? "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
