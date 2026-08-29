import { useCallback, useEffect, useRef, useState } from "react";
import type { DistrictSummary } from "../../types";
import { RiskBadge } from "./RiskBadge";
import { Icon } from "./Icon";
import { t } from "../../i18n";

const RISK_SCORE: Record<string, number> = {
  high: 8,
  medium: 5,
  low: 2,
};

const CARD_STEP_PX = 316; // 300px card + 16px gap

export type TrendDirection = "up" | "down" | "flat";

export interface DistrictTrend {
  mmr?: TrendDirection;
  u5mr?: TrendDirection;
  coverage?: TrendDirection;
}

interface DistrictScorecardCarouselProps {
  districts: DistrictSummary[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string | null) => void;
  /** Optional per-district metric trends, keyed by district_id. */
  trends?: Record<string, DistrictTrend>;
}

function TrendIcon({ direction, positiveIsGood }: { direction?: TrendDirection; positiveIsGood: boolean }) {
  if (!direction || direction === "flat") {
    return <Icon name="Minus" size={14} className="trend-flat" weight="bold" />;
  }
  const good = direction === "up" ? positiveIsGood : !positiveIsGood;
  return (
    <Icon
      name={direction === "up" ? "TrendUp" : "TrendDown"}
      size={14}
      className={good ? "trend-good" : "trend-bad"}
      weight="bold"
    />
  );
}

function MetricBox({
  label,
  value,
  trend,
  positiveIsGood,
}: {
  label: string;
  value: string;
  trend?: TrendDirection;
  positiveIsGood: boolean;
}) {
  return (
    <div className="carousel-metric">
      <span className="carousel-metric-label">{label}</span>
      <div className="carousel-metric-row">
        <span className="carousel-metric-value">{value}</span>
        <TrendIcon direction={trend} positiveIsGood={positiveIsGood} />
      </div>
    </div>
  );
}

function fmtMetric(value: number | null): string {
  return value == null ? "—" : String(value);
}

function ScorecardCard({
  district,
  isSelected,
  onClick,
  trend,
}: {
  district: DistrictSummary;
  isSelected: boolean;
  onClick: () => void;
  trend?: DistrictTrend;
}) {
  const alerts = district.active_alerts;
  const stockouts = district.stockout_count ?? 0;

  return (
    <article
      className={`scorecard-carousel-card ${isSelected ? "scorecard-carousel-card--selected" : ""}`}
      onClick={onClick}
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="scorecard-header">
        <div>
          <h3 className="scorecard-name">{district.district_name}</h3>
          {district.region && <span className="scorecard-region">{district.region} region</span>}
        </div>
        {district.malaria_risk_level ? (
          <RiskBadge score={RISK_SCORE[district.malaria_risk_level] ?? 5} size="sm" />
        ) : (
          <span className="scorecard-norisk">{t("noRiskData")}</span>
        )}
      </div>

      <div className="carousel-metrics-grid">
        <MetricBox
          label="MMR"
          value={fmtMetric(district.maternal_mortality_ratio)}
          trend={district.maternal_mortality_ratio == null ? undefined : trend?.mmr}
          positiveIsGood={false}
        />
        <MetricBox
          label="U5MR"
          value={fmtMetric(district.under5_mortality_rate)}
          trend={district.under5_mortality_rate == null ? undefined : trend?.u5mr}
          positiveIsGood={false}
        />
        <MetricBox
          label="Coverage"
          value={
            district.essential_service_coverage == null
              ? "—"
              : `${Math.round(district.essential_service_coverage * 100)}%`
          }
          trend={district.essential_service_coverage == null ? undefined : trend?.coverage}
          positiveIsGood
        />
      </div>

      <div className="scorecard-footer">
        {district.facility_count != null && (
          <span className="scorecard-facils">
            <Icon name="MapPin" size={14} color="#40916C" />
            {district.facility_count} {t("facilitiesWord")}
          </span>
        )}
        <span className={`scorecard-alerts ${alerts > 0 ? "has-alerts" : ""}`}>
          <Icon name="Bell" size={14} color={alerts > 0 ? "#ff3b30" : "#8e8e93"} />
          {alerts} {t("alertsWord")}
        </span>
        <span className={`scorecard-stock ${stockouts > 0 ? "has-stockouts" : ""}`}>
          <Icon name="Package" size={14} color={stockouts > 0 ? "#ff9500" : "#8e8e93"} />
          {stockouts} {t("stockoutsWord")}
        </span>
        {alerts === 0 && stockouts === 0 && (
          <span className="scorecard-clear">
            <Icon name="CheckCircle" size={14} color="#2D6A4F" />
            {t("allClear")}
          </span>
        )}
      </div>

      <div className={`scorecard-map-hint ${isSelected ? "scorecard-map-hint--visible" : ""}`}>
        <Icon name="MapPin" size={12} />
        <span>{t("showingOnMap")}</span>
      </div>
    </article>
  );
}

export function DistrictScorecardCarousel({
  districts,
  selectedDistrictId,
  onSelectDistrict,
  trends,
}: DistrictScorecardCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, districts.length]);

  const scrollToCard = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, districts.length - 1));
    el.scrollTo({ left: clamped * CARD_STEP_PX, behavior: "smooth" });
  }, [districts.length]);

  const scrollByCards = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === "left" ? -CARD_STEP_PX : CARD_STEP_PX;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  // Desktop keyboard navigation (arrow keys page the carousel)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") scrollByCards("left");
      if (e.key === "ArrowRight") scrollByCards("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scrollByCards]);

  // Auto-scroll the selected card into view when selection changes externally (dots/map)
  useEffect(() => {
    if (!selectedDistrictId) return;
    const index = districts.findIndex((d) => d.district_id === selectedDistrictId);
    if (index >= 0) scrollToCard(index);
  }, [selectedDistrictId, districts, scrollToCard]);

  if (districts.length === 0) {
    return (
      <div className="district-scorecard">
        <h2>District Health Scorecard</h2>
        <p className="text-caption text-neutral">No district data available yet.</p>
      </div>
    );
  }

  return (
    <div className="district-scorecard">
      <div className="relative group scorecard-carousel">
        <button
          type="button"
          className={`scorecard-carousel-arrow scorecard-carousel-arrow--left ${
            canScrollLeft ? "" : "scorecard-carousel-arrow--hidden"
          }`}
          onClick={() => scrollByCards("left")}
          aria-label={t("previousDistrict")}
        >
          <Icon name="CaretLeft" size={20} />
        </button>

        <div ref={scrollRef} className="scorecard-carousel-track scrollbar-hide">
          {districts.map((d) => (
            <ScorecardCard
              key={d.district_id}
              district={d}
              isSelected={selectedDistrictId === d.district_id}
              trend={trends?.[d.district_id]}
              onClick={() =>
                onSelectDistrict(selectedDistrictId === d.district_id ? null : d.district_id)
              }
            />
          ))}
        </div>

        <button
          type="button"
          className={`scorecard-carousel-arrow scorecard-carousel-arrow--right ${
            canScrollRight ? "" : "scorecard-carousel-arrow--hidden"
          }`}
          onClick={() => scrollByCards("right")}
          aria-label={t("nextDistrict")}
        >
          <Icon name="CaretRight" size={20} />
        </button>
      </div>

      <div className="scorecard-carousel-dots" role="tablist" aria-label="Select district card">
        {districts.map((d, i) => (
          <button
            key={d.district_id}
            type="button"
            role="tab"
            aria-selected={selectedDistrictId === d.district_id}
            aria-label={d.district_name}
            className={`scorecard-carousel-dot ${
              selectedDistrictId === d.district_id ? "scorecard-carousel-dot--active" : ""
            }`}
            onClick={() => {
              onSelectDistrict(d.district_id);
              scrollToCard(i);
            }}
          />
        ))}
      </div>
    </div>
  );
}
