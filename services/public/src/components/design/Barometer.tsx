import { RISK_NODATA_HEX, toneToColor } from "../../design/risk";
import type { PublicRiskLevel } from "../../types/public";

/** The Samala signature: a vertical four-cell heat gauge showing how hot a
 * district's active alert level is. `null` renders no cells lit — "nothing
 * active", never a fabricated number. */
export function Barometer({ level, className = "" }: { level: PublicRiskLevel; className?: string }) {
  const tone = level ?? "low";
  const heat = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
  const lit = toneToColor(tone);
  const label = level ?? "none";
  const aria = level
    ? `District risk: ${label}`
    : "No active health alerts in this district";

  return (
    <div
      role="img"
      aria-label={aria}
      title={aria}
      data-testid="barometer"
      className={`flex flex-col items-center gap-1 ${className}`}
    >
      <div className="flex flex-col gap-[3px] rounded-[6px] p-[3px] bg-surface-card border border-surface-border">
        {[4, 3, 2, 1].map((cell) => {
          const on = heat >= cell;
          return (
            <span
              key={cell}
              className="barometer-cell block h-[26px] w-[46px] rounded-[4px] transition-colors duration-200"
              style={{
                backgroundColor: on ? lit : "transparent",
                boxShadow: on ? undefined : `inset 0 0 0 1px ${RISK_NODATA_HEX}33`,
              }}
            />
          );
        })}
      </div>
      <span
        className="mt-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: level ? lit : "#8E8E93" }}
      >
        {level ?? "•"}
      </span>
    </div>
  );
}