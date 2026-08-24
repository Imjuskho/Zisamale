import { useEffect, useRef } from "react";
import type { Facility } from "../../services/facilityService";
import { FACILITY_CONFIG } from "../../services/facilityService";
import { Icon } from "../design/Icon";
import { bedBarColor, facilityStatusColor } from "../../design/riskScale";
import { humanize } from "../../utils/text";

interface RealFacilityPanelProps {
  facility: Facility;
  onClose: () => void;
  onRefer?: (facility: Facility) => void;
}

/**
 * Slide-out details for a facility from the live registry
 * (MOH facility master list). Companion to ReferralEngine.
 */
export function RealFacilityPanel({ facility, onClose, onRefer }: RealFacilityPanelProps) {
  const config = FACILITY_CONFIG[facility.type];
  const statusCol = facilityStatusColor(facility.operational_status);
  const hasBeds = facility.beds_total != null && facility.beds_total > 0;
  const bedsAvail = facility.beds_available ?? 0;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="facility-panel" role="dialog" aria-label={`${facility.name} details`}>
      <div className="facility-panel-header">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: config.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {config.label}
        </div>
        <div className="facility-panel-title">
          <h2>{facility.name}</h2>
          <span className="facility-panel-type">
            {humanize(facility.type)}
          </span>
          <span
            className="facility-panel-type"
            style={{ color: statusCol, fontWeight: 600, marginLeft: 8 }}
          >
            {facility.operational_status ?? "Unverified"}
          </span>
        </div>
        <button
          ref={closeRef}
          className="facility-panel-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Location */}
      <section className="facility-section">
        <h3><Icon name="MapPin" size={16} /> Location</h3>
        <p style={{ margin: 0, fontSize: 13 }}>
          {facility.district}
          {facility.traditional_authority ? ` · TA ${facility.traditional_authority}` : ""}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>
          {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
        </p>
      </section>

      {/* Bed availability */}
      {hasBeds && (
        <section className="facility-section">
          <h3><Icon name="Hospital" size={16} /> Bed Availability</h3>
          <div className="facility-bed-summary">
            <span
              className="facility-bed-total-big"
              style={{
                color: bedBarColor(bedsAvail, facility.beds_total ?? 1),
              }}
            >
              {bedsAvail}
            </span>
            <span className="facility-bed-total-label">beds free of {facility.beds_total}</span>
          </div>
          <div className="facility-bed-bar">
            <div
              className="facility-bed-bar-fill"
              style={{
                width: `${((facility.beds_total ?? 1) > 0 ? bedsAvail / (facility.beds_total as number) : 0) * 100}%`,
                backgroundColor: bedBarColor(bedsAvail, facility.beds_total ?? 1),
              }}
            />
          </div>
        </section>
      )}

      {/* Services */}
      {facility.services.length > 0 && (
        <section className="facility-section">
          <h3><Icon name="Package" size={16} /> Services</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {facility.services.map((s) => (
              <span
                key={s}
                style={{
                  padding: "3px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  background: "var(--color-bg-muted, #eee)",
                  color: "var(--color-text, #333)",
                }}
              >
                {humanize(s)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Data provenance */}
      <section className="facility-section">
        <h3><Icon name="CheckCircle" size={16} /> Registry Status</h3>
        {facility.chw_verified ? (
          <p style={{ margin: 0, fontSize: 12, color: "#2d7d46" }}>
            <Icon name="CheckCircle" size={13} color="#2d7d46" /> Verified by{" "}
            {facility.chw_verified_by} on {facility.chw_verified_date}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "#e65100" }}>
            Location not yet verified by field staff
          </p>
        )}
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>
          Source: {facility.data_source} · Last verified {facility.last_verified}
        </p>
      </section>

      {/* Actions */}
      <div className="facility-panel-actions">
        <button className="btn-primary facility-action-btn" onClick={() => onRefer?.(facility)}>
          <Icon name="ArrowRight" size={16} />
          Refer patient here
        </button>
      </div>

      <div className="facility-panel-updated">
        MHF code: {facility.mhfrcode ?? "—"} · DHIS2: {facility.dhis2code ?? "—"}
      </div>
    </div>
  );
}
