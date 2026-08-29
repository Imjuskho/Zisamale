import { useMemo, useRef } from "react";
import type { Facility } from "../../services/facilityService";
import type { ReferralRequest, ReferralResult } from "../../types";
import { Icon } from "../design/Icon";
import { useModalDialog } from "../../hooks/useModalDialog";

interface ReferralEngineProps {
  request: ReferralRequest;
  facilities: Facility[];
  onSelectFacility?: (facility: Facility) => void;
  onDismiss?: () => void;
}

/**
 * Services (from the live facility registry) that satisfy each condition.
 * Matched by substring so registry naming variations still hit.
 */
const CONDITION_SERVICES: Record<string, string[]> = {
  obstetric: ["maternity", "obstetric", "delivery", "caesarean", "c_section", "emnc"],
  paediatric: ["paediatric", "pediatric", "child", "nicu", "immunisation"],
  trauma: ["surgery", "theatre", "trauma", "orthopaedic"],
  medical: ["general", "opd", "outpatient"],
};

/** Average rural transit speed in Malawi (km/h) used for ETA estimates. */
const AVG_SPEED_KMH = 40;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(distanceKm: number): number {
  return distanceKm === Infinity ? Infinity : Math.round((distanceKm / AVG_SPEED_KMH) * 60);
}

function hasConditionCapacity(facility: Facility, condition: string): boolean {
  const required = CONDITION_SERVICES[condition] ?? ["general"];
  return required.some((kw) =>
    facility.services.some((s) => s.toLowerCase().includes(kw)),
  );
}

function scoreFacility(facility: Facility, request: ReferralRequest): ReferralResult {
  const distance = haversineKm(request.patient_lat, request.patient_lng, facility.latitude, facility.longitude);
  const eta = etaMinutes(distance);

  const capabilities_matched = hasConditionCapacity(facility, request.condition);
  const beds_available = (facility.beds_available ?? 0) > 0;
  const status_ok = facility.operational_status === "Functional";

  const score =
    (capabilities_matched ? 0.4 : 0) +
    (beds_available ? 0.3 : 0) +
    (status_ok ? 0.3 : 0);

  return {
    facility,
    distance_km: Math.round(distance * 10) / 10,
    eta_minutes: eta,
    score,
    capabilities_matched,
    beds_available,
    status_ok,
    recommended: false,
  };
}

export function ReferralEngine({ request, facilities, onSelectFacility, onDismiss = () => {} }: ReferralEngineProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalDialog(dialogRef, closeRef, onDismiss);
  const results = useMemo(() => {
    const scored = facilities.map((f) => scoreFacility(f, request));
    scored.sort((a, b) => b.score - a.score || a.distance_km - b.distance_km);
    if (scored.length > 0) scored[0].recommended = true;
    return scored;
  }, [request, facilities]);

  return (
    <div ref={dialogRef} className="referral-engine" role="dialog" aria-modal="true" aria-label="Referral routing">
      <div className="referral-header">
        <Icon name="ArrowRight" size={20} color="var(--color-primary)" />
        <h3>Referral Routing</h3>
        <button ref={closeRef} className="referral-close" onClick={onDismiss} aria-label="Close">
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
            key={result.facility.id}
            className={`referral-card ${result.recommended ? "referral-card--recommended" : ""}`}
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
                  {result.distance_km}km · ≈{result.eta_minutes} min ·{" "}
                  {result.facility.operational_status}
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
              <span className={`referral-check ${result.status_ok ? "referral-check--pass" : "referral-check--fail"}`}>
                <Icon name={result.status_ok ? "CheckCircle" : "XCircle"} size={14} />
                Fully functional
              </span>
            </div>

            <button
              className={`btn ${result.recommended ? "btn-primary" : "btn-secondary"} referral-send-btn`}
              onClick={() => onSelectFacility?.(result.facility)}
            >
              <Icon name="ArrowRight" size={14} />
              {result.recommended ? "SEND REFERRAL" : "Select"}
            </button>
          </div>
        ))}
        {results.length === 0 && (
          <p className="referral-empty">No registered facilities available for routing.</p>
        )}
      </div>
    </div>
  );
}
