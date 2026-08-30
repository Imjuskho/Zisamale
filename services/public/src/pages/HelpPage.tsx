import { useMemo, useState } from "react";
import { Phone, Hospital, MagnifyingGlass } from "@phosphor-icons/react";
import { useT } from "../components/design/LanguageContext";
import { useDistrict } from "../components/design/DistrictContext";
import { useFetch } from "../hooks/useFetch";
import { getPublicFacilities } from "../services/api";
import { fill } from "../i18n";

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${
        on ? "bg-leaf-soft text-leaf" : "bg-surface-card text-apple-muted48"
      }`}
    >
      {label}
    </span>
  );
}

export function HelpPage() {
  const t = useT();
  const { district } = useDistrict();
  const facilities = useFetch(() => getPublicFacilities());
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    let items = facilities.data?.facilities ?? [];
    if (district?.id) items = items.filter((f) => f.district_name === district.name);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((f) => f.name.toLowerCase().includes(q));
    }
    return items.slice(0, 50);
  }, [facilities.data, district, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      <p className="text-label uppercase tracking-[0.14em] text-clay">{t("appTagline")}</p>
      <h1 className="mt-2 text-headline text-apple-ink">{t("navHelp")}</h1>
      <p className="mt-2 max-w-2xl text-lead text-apple-muted48">{t("helpBody")}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <section className="rounded-lg border border-surface-border bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-title text-apple-ink">
            <Phone size={20} weight="fill" aria-hidden />
            {t("emergencyNumbers")}
          </h2>
          <ul className="mt-4 space-y-2">
            <li>
              <a href="tel:102" className="flex h-11 items-center rounded-md bg-[#1D1D1F] px-4 text-[16px] font-semibold text-white">
                102 — {t("emergencyCall")}
              </a>
            </li>
          </ul>
          <p className="mt-4 text-[14px] leading-relaxed text-apple-muted48">{t("helpNote")}</p>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-card p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-title text-apple-ink">
              <Hospital size={20} weight="fill" aria-hidden />
              {t("facilitiesTitle")}
            </h2>
            <label className="relative block sm:w-72">
              <span className="sr-only">{t("searchFacilities")}</span>
              <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted48" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchFacilities")}
                className="h-11 w-full rounded-pill border border-surface-border bg-white pl-10 pr-4 text-[15px] text-apple-ink placeholder:text-apple-muted48 focus:shadow-focus"
              />
            </label>
          </div>

          {facilities.loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-white" />
              ))}
            </div>
          ) : facilities.error ? (
            <p className="mt-4 text-apple-muted48">{t("errorBody")}</p>
          ) : list.length === 0 ? (
            <p className="mt-4 text-apple-muted48">{fill(t("noFacilities"), { query: query || t("noDistrictYet") })}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {list.map((f) => (
                <li key={f.facility_id} className="rounded-md bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-semibold text-apple-ink">{f.name}</p>
                    <span className="text-[13px] text-apple-muted48">{f.district_name}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge on={f.has_maternity} label={t("maternity")} />
                    <Badge on={f.has_lab} label={t("lab")} />
                    <Badge on={f.has_pharmacy} label={t("pharmacy")} />
                    <Badge on={f.facility_type.includes("health")} label={f.facility_type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}