import { useT, useLanguage } from "./LanguageContext";

/** Chichewa ↔ English toggle. Pill, 44px hit area, labelled for screen
 * readers. Persisted via LanguageContext. */
export function LanguageToggle() {
  const { language, toggle } = useLanguage();
  const t = useT();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={language === "ny" ? "Read in English" : "Werengani mu Chichewa"}
      className="inline-flex h-11 items-center gap-1 rounded-pill border border-surface-border bg-surface-card px-1 text-[13px] font-semibold"
    >
      <span
        className={`flex h-9 items-center rounded-pill px-3 transition-colors ${
          language === "ny" ? "bg-apple-ink text-white" : "text-apple-muted48"
        }`}
      >
        {language === "ny" ? "CH" : "CY"}
      </span>
      <span
        className={`flex h-9 items-center rounded-pill px-3 transition-colors ${
          language === "en" ? "bg-apple-ink text-white" : "text-apple-muted48"
        }`}
      >
        EN
      </span>
      <span className="sr-only">{t("appName")}</span>
    </button>
  );
}