import { useT } from "../components/design/LanguageContext";
import { useDistrict } from "../components/design/DistrictContext";
import { Barometer } from "../components/design/Barometer";
import { useFetch } from "../hooks/useFetch";
import { getPublicDistricts } from "../services/api";
import { fill } from "../i18n";
import type { PublicDistrict } from "../types/public";

function DistrictRow({ d, selected }: { d: PublicDistrict; selected: boolean }) {
  const t = useT();
  const toneLabel =
    d.risk_level === "low"
      ? t("riskLow")
      : d.risk_level === "medium"
        ? t("riskMedium")
        : d.risk_level === "high"
          ? t("riskHigh")
          : t("riskNone");

  return (
    <li
      className={`flex items-center gap-4 rounded-md border p-4 shadow-card transition-colors ${
        selected ? "border-apple-blue bg-info-light" : "border-surface-border bg-white"
      }`}
    >
      <Barometer level={d.risk_level} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold text-apple-ink">{d.district_name}</p>
        <p className="text-[14px] text-apple-muted48">
          {toneLabel}
          {d.active_alerts > 0 && ` · ${d.active_alerts} ${t("alertsWord")}`}
          {d.facility_count > 0 && ` · ${d.facility_count} ${t("facilitiesUnits")}`}
        </p>
      </div>
    </li>
  );
}

export function DistrictPage() {
  const t = useT();
  const { district } = useDistrict();
  const fetch = useFetch(() => getPublicDistricts());
  const districts = fetch.data?.districts ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      <p className="text-label uppercase tracking-[0.14em] text-clay">{t("appTagline")}</p>
      <h1 className="mt-2 text-headline text-apple-ink">{t("navDistrict")}</h1>
      <p className="mt-2 max-w-2xl text-lead text-apple-muted48">
        {fill(t("districtPageBody"), {
          district: district?.name ?? t("noDistrictYet"),
        })}
      </p>

      {fetch.loading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-surface-card" />
          ))}
        </div>
      ) : fetch.error ? (
        <p className="mt-6 text-apple-muted48">{t("errorBody")}</p>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {districts.map((d) => (
            <DistrictRow key={d.district_id} d={d} selected={d.district_id === district?.id} />
          ))}
        </ul>
      )}

      <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-apple-muted48">
        {t("districtPageNote")}
      </p>
    </div>
  );
}