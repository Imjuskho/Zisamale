import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { useT } from "../components/design/LanguageContext";
import { useLanguage } from "../components/design/LanguageContext";
import { useDistrict } from "../components/design/DistrictContext";
import { DistrictSelect } from "../components/design/DistrictSelect";
import { Barometer } from "../components/design/Barometer";
import { GuideCard } from "../components/design/GuideCard";
import { useFetch } from "../hooks/useFetch";
import { getPublicDistricts, getPublicGuides } from "../services/api";
import { sortBySeverity } from "../lib/severity";
import { fill } from "../i18n";
import type { PublicDistrict } from "../types/public";

function DistrictPanel({ districts }: { districts: PublicDistrict[] }) {
  const t = useT();
  const { district } = useDistrict();
  const chosen = district ? districts.find((d) => d.district_id === district.id) : undefined;

  return (
    <section aria-label="District risk" className="rounded-lg border border-surface-border bg-white p-5 shadow-card sm:p-6">
      {chosen ? (
        <div className="flex items-center gap-5">
          <Barometer level={chosen.risk_level} />
          <div className="min-w-0">
            <h2 className="text-lead text-apple-ink">
              {fill(t("riskSentence"), {
                district: chosen.district_name,
                level: t(chosen.risk_level === "low" ? "riskLow" : chosen.risk_level === "medium" ? "riskMedium" : "riskHigh"),
              })}
            </h2>
            <p className="mt-1 text-apple-muted48">
              {chosen.active_alerts === 0
                ? t("riskNone")
                : `${chosen.active_alerts} · ${chosen.facility_count} ${t("facilitiesUnits")}`}
            </p>
            <Link
              to="/dziko-lathu"
              className="mt-2 inline-flex items-center gap-1 text-[15px] font-semibold text-apple-blue hover:underline"
            >
              {t("changeDistrict")}
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h2 className="text-title text-apple-ink">{t("noDistrictYet")}</h2>
            <p className="mt-1 text-apple-muted48">{t("chooseDistrictBody")}</p>
          </div>
          <DistrictSelect districts={districts} className="w-full sm:w-72" />
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const t = useT();
  const { language } = useLanguage();
  const districts = useFetch(() => getPublicDistricts());
  const guides = useFetch(() => getPublicGuides());

  const featured = sortBySeverity(guides.data?.guides ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="pt-10 sm:pt-16">
        <p className="text-label uppercase tracking-[0.14em] text-clay">{t("appTagline")}</p>
        <h1 className="mt-2 max-w-2xl text-display text-apple-ink">{t("homeWelcome")}</h1>
        <p className="mt-3 max-w-xl text-lead text-apple-muted48">{t("homeSub")}</p>
      </section>

      <div className="mt-8">
        {districts.loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-surface-card" />
        ) : districts.error || !districts.data ? (
          <DistrictFallback />
        ) : (
          <DistrictPanel districts={districts.data.districts} />
        )}
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-headline text-apple-ink">{t("homeGuidesTitle")}</h2>
            <p className="mt-1 text-apple-muted48">{t("homeGuidesSub")}</p>
          </div>
          <Link
            to="/zindule"
            className="hidden shrink-0 items-center gap-1 rounded-pill border border-surface-border px-4 py-2 text-[15px] font-semibold text-apple-ink sm:inline-flex"
          >
            {t("viewAllGuides")}
            <ArrowRight size={15} weight="bold" aria-hidden />
          </Link>
        </div>

        {guides.loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-surface-card" />
            ))}
          </div>
        ) : guides.error ? (
          <p className="mt-6 text-apple-muted48">{t("errorBody")}</p>
        ) : featured.length === 0 ? (
          <p className="mt-6 text-apple-muted48">{t("noGuides")}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((g) => (
              <GuideCard key={g.guide_id} guide={g} />
            ))}
          </div>
        )}

        <span className="ml-auto mt-4 block text-right" lang={language}>
          {t("communityNotice")}
        </span>
      </section>
    </div>
  );
}

function DistrictFallback() {
  const t = useT();
  return (
    <section className="rounded-lg border border-surface-border bg-surface-card p-5">
      <p className="text-apple-muted48">{t("errorBody")}</p>
    </section>
  );
}