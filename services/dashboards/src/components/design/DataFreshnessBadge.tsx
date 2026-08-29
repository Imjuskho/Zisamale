// src/components/design/DataFreshnessBadge.tsx
// Surveillance honesty: every data-driven surface declares its age.
// Colors come from the shared editorial palette (components.css `.dfb--*`);
// arithmetic lives in utils/recency.ts — this component never derives
// staleness by hand.

import { useT } from "./LanguageContext";
import type { StringKey } from "../../i18n";
import {
  freshnessAgeParts,
  freshnessFromSync,
  type FreshnessLevel,
} from "../../utils/recency";
import type { DataSourceMeta } from "../../types";

interface Props {
  meta: DataSourceMeta;
  showSource?: boolean;
  /** Inline chip (default) vs. block panel for hero sections. */
  compact?: boolean;
  /** Injectable clock for tests/stories. */
  now?: Date;
}

type BadgeTone = FreshnessLevel | "never";

const TONE_LABEL_KEY: Record<BadgeTone, StringKey> = {
  live: "freshnessLive",
  recent: "freshnessRecent",
  stale: "freshnessStale",
  historic: "freshnessHistoric",
  never: "freshnessNever",
};

/** Language-neutral compact age ("3d", "2w", "4mo", "1y"); null when unknown. */
function compactAge(
  meta: DataSourceMeta,
  now: Date,
): string | null {
  const parts = freshnessAgeParts(meta.last_sync_at, now);
  return parts === null ? null : `${parts.value}${parts.unit}`;
}

export function DataFreshnessBadge({
  meta,
  showSource = false,
  compact = true,
  now = new Date(),
}: Props) {
  const t = useT();

  // `never` beats any server-side score: no sync date means nothing to trust.
  const tone: BadgeTone =
    meta.last_sync_at === null ? "never" : meta.freshness_score;
  const label = t(TONE_LABEL_KEY[tone]);
  const age = compactAge(meta, now);
  const derived =
    tone === "never" ? "never" : freshnessFromSync(meta.last_sync_at, now);
  const ratio =
    meta.expected_count > 0
      ? Math.round((meta.record_count / meta.expected_count) * 100)
      : null;

  if (!compact) {
    return (
      <div
        className={`dfb dfb--block dfb--${derived}`}
        role="status"
        aria-label={label}
      >
        <span className="dfb__dot" aria-hidden="true" />
        <span className="dfb__stack">
          <span className="dfb__level">{label}</span>
          <span className="dfb__detail">
            {age === null
              ? t("freshnessNeverSynced")
              : `${age}${ratio !== null ? ` · ${ratio}%` : ""}`}
          </span>
        </span>
        {showSource && (
          <span className="dfb__source">{meta.source.toUpperCase()}</span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`dfb dfb--inline dfb--${derived}`}
      role="status"
      aria-label={label}
    >
      {showSource && (
        <span className="dfb__source">{meta.source.toUpperCase()}</span>
      )}
      <span>{label}</span>
      {age !== null && <span className="dfb__age">· {age}</span>}
    </span>
  );
}
