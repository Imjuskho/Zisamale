import { Phone, Hospital } from "@phosphor-icons/react";
import { useT } from "./LanguageContext";

/** Torchlight strip. Always present, one action in each language-neutral
 * form: call someone you trust, or go to the nearest health centre. */
export function EmergencyStrip() {
  const t = useT();
  return (
    <section
      aria-label="Emergency help"
      className="bg-[#1D1D1F] text-[#F5F5F7] px-4 py-3"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption font-medium text-[#F5F5F7]/95 sm:text-[15px]">
          {t("emergencyStrip")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:102"
            className="inline-flex h-11 items-center gap-2 rounded-pill bg-[#FF3B30] px-4 text-[15px] font-semibold text-white active:scale-[0.97] transition-transform"
          >
            <Phone size={18} weight="fill" aria-hidden />
            {t("emergencyCall")}
          </a>
          <a
            href="/thandizo"
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-[#48484A] px-4 text-[15px] font-semibold text-[#F5F5F7] active:scale-[0.97] transition-transform"
          >
            <Hospital size={18} weight="fill" aria-hidden />
            {t("emergencyGo")}
          </a>
        </div>
      </div>
    </section>
  );
}