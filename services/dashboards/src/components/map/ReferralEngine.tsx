import { useMemo } from "react";
import type { Facility, ReferralRequest, ReferralResult } from "../../types";
import { Icon } from "../design/Icon";

interface ReferralEngineProps {
  request: ReferralRequest;
  facilities: Facility[];
  onSelectFacility?: (facility: Facility) => void;
  onDismiss?: () => void;
}

const CONDITION_CAPABILITIES: Record<string, string[]> = {
  obstetric: ["c_section", "maternity", "blood_bank", "magnesium_sulfate"],
  paediatric: ["paediatric", "icu", "blood_bank"],
  trauma: ["surgery", "icu", "blood_bank"],
  medical: ["general"],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(distanceKm: number, roadStatus: string): number {
  const speeds: Record<string, number> = { passable: 60, "4wd_only": 35, flooded: 0, blocked: 0 };
  const speed = speeds[roadStatus] ?? 40;
  if (speed === 0) return Infinity;
  return Math.round((distanceKm / speed) * 60);
}

function scoreFacility(facility: Facility, request: ReferralRequest): ReferralResult {
  const distance = haversineKm(request.patient_lat, request.patient_lng, facility.lat, facility.lng);

  const primaryRoad = facility.roads.find((r) => r.route === "Primary") ?? facility.roads[0];
  const roadStatus = primaryRoad?.status ?? "passable";
  const eta = etaMinutes(distance, roadStatus);

  const required = CONDITION_CAPABILITIES[request.condition] ?? ["general"];
  const hasCapability = required.some((cap) =>
    facility.stock.some((s) => s.commodity.toLowerCase().includes(cap)) ||
    facility.beds.some((b) => b.ward.toLowerCase().includes(cap))
  );

  const bedsAvail = facility.beds.reduce((s, b) => s + b.available, 0) > 0;
  const hasStock = !facility.stock.some((s) => s.status === "critical");
  const hasStaff = facility.staff.some((s) => s.status === "present" && (s.role.toLowerCase().includes("doctor") || s.role.toLowerCase().includes("clinical")));

  const score =
    (hasCapability ? 0.4 : 0) +
    (bedsAvail ? 0.2 : 0) +
    (hasStock ? 0.15 : 0) +
    (hasStaff ? 0.15 : 0) +
    (roadStatus === "passable" ? 0.1 : roadStatus === "4wd_only" ? 0.05 : 0);

  return {
    facility,
    distance_km: Math.round(distance * 10) / 10,
    eta_minutes: eta,
    road_status: primaryRoad ?? { route: "Primary", status: "passable" },
    score,
    capabilities_matched: hasCapability,
    beds_available: bedsAvail,
    stock_available: hasStock,
    staff_present: hasStaff,
    recommended: false,
  };
}

export function ReferralEngine({ request, facilities, onSelectFacility, onDismiss }: ReferralEngineProps) {
  const results = useMemo(() => {
    const scored = facilities.map((f) => scoreFacility(f, request));
    scored.sort((a, b) => {
      if (a.eta_minutes === Infinity && b.eta_minutes !== Infinity) return 1;
      if (a.eta_minutes !== Infinity && b.eta_minutes === Infinity) return -1;
      return b.score / (b.eta_minutes || 1) - a.score / (a.eta_minutes || 1);
    });
    if (scored.length > 0) scored[0].recommended = true;
    return scored;
  }, [request, facilities]);

  return (
    <div className="referral-engine" role="dialog" aria-label="Referral routing">
      <div className="referral-header">
        <Icon name="ArrowRight" size={20} color="#0f7b8a" />
        <h3>Referral Routing</h3>
        <button className="referral-close" onClick={onDismiss} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="referral-condition">
        <span className="referral-condition-label">Condition:</span> {request.condition}
        <span className="referral-condition-divider">|</span>
        <span className="referral-condition-label">Urgency:</span>
        <span className={`referral-urgency referral-urgency--${request.urgency}`}>{request.urgency}</span>
      </div>

      <div className="referral-results">
        {results.map((result, idx) => (
          <div
            key={result.facility.facility_id}
            className={`referral-card ${result.recommended ? "referral-card--recommended" : ""} ${result.eta_minutes === Infinity ? "referral-card--unreachable" : ""}`}
          >
            {result.recommended && (
              <div className="referral-recommended-badge">
                <Icon name="Trophy" size={14} color="#fff" /> RECOMMENDED
              </div>
            )}

            <div className="referral-card-header">
              <span className="referral-rank">#{idx + 1}</span>
              <div className="referral-card-title">
                <strong>{result.facility.name}</strong>
                <span className="referral-card-distance">
                  {result.distance_km}km · {result.eta_minutes === Infinity ? "Unreachable" : `${result.eta_minutes} min`}
                  · Road: {result.road_status.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="referral-card-checks">
              <span className={`referral-check ${result.capabilities_matched ? "referral-check--pass" : "referral-check--fail"}`}>
                <Icon name={result.capabilities_matched ? "CheckCircle" : "XCircle"} size={14} />
                {request.condition} capacity
              </span>
              <span className={`referral-check ${result.beds_available ? "referral-check--pass" : "referral-check--fail"}`}>
                <Icon name={result.beds_available ? "CheckCircle" : "XCircle"} size={14} />
                Beds available
              </span>
              <span className={`referral-check ${result.stock_available ? "referral-check--pass" : "referral-check--fail"}`}>
                <Icon name={result.stock_available ? "CheckCircle" : "XCircle"} size={14} />
                MgSO4 / drugs
              </span>
              <span className={`referral-check ${result.staff_present ? "referral-check--pass" : "referral-check--fail"}`}>
                <Icon name={result.staff_present ? "CheckCircle" : "XCircle"} size={14} />
                Clinician on duty
              </span>
            </div>

            {result.eta_minutes !== Infinity && (
              <button
                className={`btn ${result.recommended ? "btn-primary" : "btn-secondary"} referral-send-btn`}
                onClick={() => onSelectFacility?.(result.facility)}
              >
                <Icon name="ArrowRight" size={14} />
                {result.recommended ? "SEND REFERRAL" : "Select"}
              </button>
            )}
            {result.eta_minutes === Infinity && (
              <span className="referral-unreachable-label">
                <Icon name="XCircle" size={14} color="#c62828" /> Cannot reach — {result.road_status.status.replace("_", " ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
