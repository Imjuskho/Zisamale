/**
 * FACILITY POPUP — Rich popup content for real facility markers
 *
 * Shows: name, type badge, district, bed bar, services, CHW verification.
 * Used by both Leaflet markers and the slide-out panel.
 */
import type { Facility } from "../../services/facilityService";
import { FACILITY_CONFIG } from "../../services/facilityService";
import {
  bedBarColor,
  facilityStatusColor as statusColor,
} from "../../design/riskScale";
import { humanize } from "../../utils/text";

export function FacilityPopupHTML(facility: Facility): string {
  const config = FACILITY_CONFIG[facility.type];
  const statusCol = statusColor(facility.operational_status);

  const bedBar =
    facility.beds_total != null && facility.beds_total > 0
      ? `
      <div style="margin:8px 0;padding:6px 8px;background:var(--color-bg-muted,#f5f5f0);border-radius:6px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
          <span style="color:var(--color-text-muted,#666);">Bed Availability</span>
          <span style="font-weight:600;color:${bedBarColor(facility.beds_available ?? 0, facility.beds_total)};">
            ${facility.beds_available ?? "?"}/${facility.beds_total}
          </span>
        </div>
        <div style="width:100%;height:6px;background:var(--color-border,#e0e0e0);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${((facility.beds_available ?? 0) / facility.beds_total) * 100}%;background:${bedBarColor(facility.beds_available ?? 0, facility.beds_total)};border-radius:3px;"></div>
        </div>
      </div>`
      : "";

  const services =
    facility.services.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;">
      ${facility.services
        .map(
          (s) =>
            `<span style="padding:2px 6px;background:var(--color-bg-muted,#eee);color:var(--color-text,#333);font-size:10px;border-radius:10px;">${humanize(s)}</span>`,
        )
        .join("")}
    </div>`
      : "";

  const verification = facility.chw_verified
    ? `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#2D7D46;margin-top:6px;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        Verified by ${facility.chw_verified_by} on ${facility.chw_verified_date}
      </div>`
    : `<div style="font-size:10px;color:#E65100;margin-top:6px;">Location not yet verified by field staff</div>`;

  return `
    <div style="min-width:240px;max-width:300px;font-family:Inter,system-ui,sans-serif;">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${config.color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0;">
          ${config.label}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:13px;line-height:1.2;color:var(--color-text,#1a1a2e);">${facility.name}</div>
          <div style="font-size:11px;color:var(--color-text-muted,#666);margin-top:2px;">${facility.district}${facility.traditional_authority ? " \u2022 " + facility.traditional_authority : ""}</div>
          <div style="font-size:11px;color:${statusCol};font-weight:500;margin-top:1px;">${facility.operational_status ?? "Unverified"}</div>
        </div>
      </div>
      ${bedBar}
      ${services}
      ${verification}
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button onclick="window.dispatchEvent(new CustomEvent('zisamale:refer',{detail:{facilityId:'${facility.id}'}}))" style="flex:1;padding:6px 0;background:#2D7D46;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Refer patient</button>
        <button onclick="window.dispatchEvent(new CustomEvent('zisamale:view-facility',{detail:{facilityId:'${facility.id}'}}))" style="flex:1;padding:6px 0;background:transparent;color:var(--color-text,#333);border:1px solid var(--color-border,#ddd);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">View details</button>
      </div>
    </div>
  `;
}
