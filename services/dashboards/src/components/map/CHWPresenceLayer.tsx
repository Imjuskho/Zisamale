import { useState } from "react";
import type { CHWLocation } from "../../types";
import { Icon } from "../design/Icon";

interface CHWPresenceLayerProps {
  chws: CHWLocation[];
  supervisorView?: boolean;
  onCheckInRequest?: (chwId: string) => void;
}

function hoursSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
}

function CHWDot({ chw, supervisorView, onCheckInRequest }: {
  chw: CHWLocation;
  supervisorView: boolean;
  onCheckInRequest?: (chwId: string) => void;
}) {
  const hours = hoursSince(chw.last_sync_at);
  const isStale = hours > 48;
  const isEmergency = chw.status === "emergency";

  const glowColor = isEmergency ? "#c62828" : isStale ? "#e65100" : "#0f7b8a";
  const opacity = isStale ? 0.3 : 1;

  return (
    <div
      className={`chw-dot ${isEmergency ? "chw-dot--emergency" : ""} ${isStale ? "chw-dot--stale" : ""}`}
      style={{ opacity }}
      title={`${chw.chw_name} — ${chw.ta_name} — ${hours}h since sync`}
    >
      <div className="chw-dot-glow" style={{ borderColor: glowColor }} />
      <div className="chw-dot-core" style={{ backgroundColor: glowColor }} />
      <span className="chw-dot-label">{chw.chw_name.split(" ")[0]}</span>

      {supervisorView && isStale && (
        <button
          className="chw-checkin-btn"
          onClick={() => onCheckInRequest?.(chw.chw_id)}
          aria-label={`Request check-in from ${chw.chw_name}`}
        >
          <Icon name="Bell" size={12} />
        </button>
      )}
    </div>
  );
}

export function CHWPresenceLayer({ chws, supervisorView = false, onCheckInRequest }: CHWPresenceLayerProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = chws.filter((c) => c.presence_level !== "ghost");
  const ghosts = chws.filter((c) => c.presence_level === "ghost");

  return (
    <div className="chw-presence-layer">
      <button className="chw-presence-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Users" size={16} />
        <span>CHW Presence ({visible.length}/{chws.length})</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="chw-presence-panel">
          <p className="chw-presence-note">
            <Icon name="ShieldCheck" size={14} /> Location is opt-in. CHWs choose their visibility level.
          </p>

          {visible.length > 0 && (
            <div className="chw-presence-list">
              {visible.map((chw) => (
                <CHWDot
                  key={chw.chw_id}
                  chw={chw}
                  supervisorView={supervisorView}
                  onCheckInRequest={onCheckInRequest}
                />
              ))}
            </div>
          )}

          {ghosts.length > 0 && (
            <div className="chw-presence-ghosts">
              <span className="chw-ghost-label">
                <Icon name="Eye" size={14} /> {ghosts.length} CHW(s) in ghost mode
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
