import L from "leaflet";
import type { Facility, FacilityType, FacilityStatus } from "../../types";

const TYPE_RING: Record<FacilityType, string> = {
  district_hospital: "#1e40af",
  community_hospital: "#0f7b8a",
  health_centre: "#2d7d46",
  health_post: "#6b7280",
  private: "#7c3aed",
};

const STATUS_FILL: Record<FacilityStatus, string> = {
  operational: "#22c55e",
  partial: "#f59e0b",
  closed: "#ef4444",
};

function bedsAvailable(facility: Facility): number {
  return facility.beds.reduce((sum, b) => sum + b.available, 0);
}

function bedsTotal(facility: Facility): number {
  return facility.beds.reduce((sum, b) => sum + b.total, 0);
}

function topStockStatus(facility: Facility): string {
  const critical = facility.stock.filter((s) => s.status === "critical").length;
  if (critical > 0) return `${critical} CRITICAL`;
  const amber = facility.stock.filter((s) => s.status === "amber").length;
  if (amber > 0) return `${amber} low`;
  return "OK";
}

function staffLabel(facility: Facility): string {
  const doctor = facility.staff.find((s) => s.role.toLowerCase().includes("doctor") || s.role.toLowerCase().includes("medical officer"));
  if (doctor && doctor.status === "present") return `Dr. ${doctor.name.split(" ").pop()}`;
  const co = facility.staff.find((s) => s.role.toLowerCase().includes("clinical"));
  if (co && co.status === "present") return co.name;
  const anyPresent = facility.staff.find((s) => s.status === "present");
  if (anyPresent) return anyPresent.name;
  return "No staff";
}

function staffIcon(facility: Facility): string {
  const doctor = facility.staff.find((s) => s.role.toLowerCase().includes("doctor") || s.role.toLowerCase().includes("medical officer"));
  if (doctor && doctor.status === "present") return "闪电";
  const hasStaff = facility.staff.some((s) => s.status === "present");
  if (hasStaff) return "○";
  return "✕";
}

function facilityTypeLabel(t: FacilityType): string {
  return {
    district_hospital: "DH",
    community_hospital: "CH",
    health_centre: "HC",
    health_post: "HP",
    private: "PV",
  }[t];
}

export function createFacilityIcon(facility: Facility): L.DivIcon {
  const ring = TYPE_RING[facility.facility_type];
  const fill = STATUS_FILL[facility.status];
  const beds = bedsAvailable(facility);
  const total = bedsTotal(facility);
  const stock = topStockStatus(facility);
  const staff = staffLabel(facility);
  const staffIconChar = staffIcon(facility);
  const pulse = facility.emergency_receiving;

  const html = `
    <div class="facility-marker ${pulse ? "facility-marker--pulse" : ""}" style="--ring: ${ring}; --fill: ${fill};">
      <div class="facility-marker__ring">
        <div class="facility-marker__badge">${facilityTypeLabel(facility.facility_type)}</div>
      </div>
      <div class="facility-marker__body">
        <div class="facility-marker__beds">${beds}/${total}</div>
        <div class="facility-marker__stock">${stock}</div>
        <div class="facility-marker__staff"><span class="facility-marker__staff-icon">${staffIconChar}</span> ${staff}</div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [140, 80],
    iconAnchor: [70, 40],
  });
}

export function createSimpleFacilityIcon(facility: Facility): L.DivIcon {
  const ring = TYPE_RING[facility.facility_type];
  const fill = STATUS_FILL[facility.status];
  const pulse = facility.emergency_receiving;

  const html = `
    <div class="facility-pin ${pulse ? "facility-pin--pulse" : ""}">
      <svg width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${ring}"/>
        <circle cx="14" cy="14" r="8" fill="${fill}"/>
        <text x="14" y="18" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${facilityTypeLabel(facility.facility_type)}</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}
