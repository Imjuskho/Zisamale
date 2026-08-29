// src/components/DataFreshnessBadge.tsx
// Editorial design system — Source Serif 4 + Space Grotesk
// Shows data age honestly: live / recent / stale / historic

import { useT } from "~/i18n";

export type FreshnessLevel = "live" | "recent" | "stale" | "historic" | "never";

interface DataSourceMeta {
  source: "dhis2" | "ichis" | "lmis" | "chw" | "climate";
  last_sync_at: string | null;      // ISO8601
  record_count: number;
  expected_count: number;
  freshness_score: FreshnessLevel;
}

interface Props {
  meta: DataSourceMeta;
  showSource?: boolean;
  compact?: boolean;
}

const FRESHNESS_CONFIG: Record<FreshnessLevel, { label: string; color: string; border: string }> = {
  live:    { label: "freshness.live",    color: "text-[#2D6A4F]", border: "border-l-[#2D6A4F]" },
  recent:  { label: "freshness.recent",  color: "text-[#8FA89B]", border: "border-l-[#8FA89B]" },
  stale:   { label: "freshness.stale",   color: "text-[#C0563B]", border: "border-l-[#C0563B]" },
  historic:{ label: "freshness.historic",color: "text-[#8C2F1B]", border: "border-l-[#8C2F1B]" },
  never:   { label: "freshness.never",   color: "text-[#8C2F1B]", border: "border-l-[#8C2F1B]" },
};

const SOURCE_ICONS: Record<string, string> = {
  dhis2:    "🏥",
  ichis:    "📱",
  lmis:     "📦",
  chw:      "🩺",
  climate:  "🌧️",
};

function formatAge(lastSync: string | null): string {
  if (!lastSync) return "—";
  const days = Math.floor((Date.now() - new Date(lastSync).getTime()) / 86400000);
  if (days < 7)   return `${days}d`;
  if (days < 30)  return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function DataFreshnessBadge({ meta, showSource = false, compact = true }: Props) {
  const { t } = useT();
  const cfg = FRESHNESS_CONFIG[meta.freshness_score];
  const age = formatAge(meta.last_sync_at);
  const ratio = meta.expected_count > 0
    ? Math.round((meta.record_count / meta.expected_count) * 100)
    : 0;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.05em] ${cfg.color} border-l-2 pl-2 ${cfg.border}`}
        aria-label={`${t(cfg.label)}: ${age} ago`}
      >
        {showSource && (
          <span className="text-[#78716C] tabular-nums">{meta.source.toUpperCase()}</span>
        )}
        <span>{t(cfg.label)}</span>
        {meta.last_sync_at && (
          <span className="text-[#78716C] tabular-nums">· {age}</span>
        )}
      </span>
    );
  }

  // Block variant — full pill for hero sections
  return (
    <div className={`flex items-center gap-3 px-3 py-2 bg-[#FBF9F4] border border-[#D6D3CD] rounded-[2px]`}>
      <span className={`w-2 h-2 rounded-full ${
        meta.freshness_score === "live" ? "bg-[#2D6A4F]" :
        meta.freshness_score === "recent" ? "bg-[#8FA89B]" :
        meta.freshness_score === "stale" ? "bg-[#C0563B]" :
        "bg-[#8C2F1B]"
      }`} />
      <div className="flex flex-col">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${cfg.color}`}>
          {t(cfg.label)}
        </span>
        <span className="text-[11px] text-[#78716C]">
          {meta.last_sync_at
            ? `${age} ago · ${ratio}% of ${meta.expected_count} expected records`
            : t("freshness.never_synced")
          }
        </span>
      </div>
    </div>
  );
}
