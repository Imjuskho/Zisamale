import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, EnvelopeSimple, Printer, X, Check } from "@phosphor-icons/react";
import { useT, useLanguage } from "../components/design/LanguageContext";
import { useFetch } from "../hooks/useFetch";
import { getPublicGuide } from "../services/api";
import { severityColor } from "../lib/severity";
import { guideTitle, guideLines } from "../components/design/GuideCard";
import { fill, t } from "../i18n";
import type { PublicGuide } from "../types/public";

function pickText(en: string | null, ny: string | null, isNy: boolean): string | null {
  return isNy && ny ? ny : en ?? ny;
}

function Section({
  kind,
  title,
  children,
  accent,
}: {
  kind: "do" | "dont" | "plain";
  title: string;
  children: React.ReactNode;
  accent: string;
}) {
  const style =
    kind === "do"
      ? { borderColor: `${accent}66`, background: `${accent}0F` }
      : kind === "dont"
        ? { borderColor: "#FF9500" }
        : {};
  return (
    <section
      className="rounded-md border-l-4 bg-white p-4 shadow-card sm:p-5"
      style={style}
    >
      <h2 className="text-title text-apple-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function StepList({ items, marker }: { items: string[]; marker: React.ReactNode }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed text-apple-muted80">
          <span className="mt-0.5 shrink-0">{marker}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideBody({ guide, lang }: { guide: PublicGuide; lang: "en" | "ny" }) {
  const isNy = lang === "ny";
  const severity = guide.severity;
  const accent = severityColor(severity);
  const emergency = severity === "emergency";

  return (
    <article className="space-y-5">
      {emergency && (
        <a
          href="tel:102"
          className="flex items-center justify-between gap-3 rounded-md border-l-4 border-[#FF3B30] bg-[#FF3B30] p-4 text-white shadow-card print:hidden"
        >
          <span className="text-lead font-semibold">{t("callNow", lang)}</span>
          <Phone size={22} weight="fill" aria-hidden />
        </a>
      )}

      <Section kind="plain" title={t("sectionWhatIsIt", lang)} accent={accent}>
        <p className="text-[16px] leading-relaxed text-apple-muted80">
          {pickText(guide.what_it_is, guide.what_it_is_chichewa, isNy)}
        </p>
      </Section>

      <Section kind="do" title={t("sectionWhatToDoNow", lang)} accent={accent}>
        <StepList
          items={guideLines(guide.what_to_do_now, guide.what_to_do_now_chichewa, lang)}
          marker={<Check size={18} weight="bold" style={{ color: accent }} aria-hidden />}
        />
      </Section>

      <Section kind="dont" title={t("sectionWhatNotToDo", lang)} accent={accent}>
        <StepList
          items={guideLines(guide.what_not_to_do, guide.what_not_to_do_chichewa, lang)}
          marker={<X size={18} weight="bold" color="#FF9500" aria-hidden />}
        />
      </Section>

      {pickText(guide.when_to_seek_help, guide.when_to_seek_help_chichewa, isNy) && (
        <section
          className="rounded-md border-l-4 p-4 shadow-card sm:p-5"
          style={{ borderColor: accent, background: `${accent}14` }}
        >
          <h2 className="text-title text-apple-ink">
            {t("sectionWhenSeekHelp", lang)}
          </h2>
          <p className="mt-2 text-[16px] leading-relaxed text-apple-muted80">
            {pickText(guide.when_to_seek_help, guide.when_to_seek_help_chichewa, isNy)}
          </p>
        </section>
      )}

      {guideLines(guide.prevention, guide.prevention_chichewa, lang).length > 0 && (
        <Section kind="plain" title={t("sectionPrevention", lang)} accent={accent}>
          <StepList
            items={guideLines(guide.prevention, guide.prevention_chichewa, lang)}
            marker={<Check size={18} weight="bold" color="#2D6A4F" aria-hidden />}
          />
        </Section>
      )}
    </article>
  );
}

export function GuideDetailPage() {
  const { guideId } = useParams<{ guideId: string }>();
  const { language } = useLanguage();
  const tr = useT();
  const fetch = useFetch(() => getPublicGuide(guideId ?? ""));
  const guide = fetch.data?.guide;

  if (fetch.loading) {
    return <div className="mx-auto max-w-3xl px-4 pb-16 pt-8"><div className="h-64 animate-pulse rounded-lg bg-surface-card" /></div>;
  }
  if (fetch.error || !guide) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <p className="text-apple-muted48">{tr("errorBody")}</p>
        <Link to="/zindule" className="mt-4 inline-flex items-center gap-1 text-[15px] font-semibold text-apple-blue">
          <ArrowLeft size={16} weight="bold" aria-hidden /> {tr("back")}
        </Link>
      </div>
    );
  }

  const severity = guide.severity;
  const accent = severityColor(severity);
  const severityKey = severity === "info" ? "severityInfo" : severity === "warning" ? "severityWarning" : "severityEmergency";
  const shareBody = fill(tr("shareText"), { title: guideTitle(guide, language) });
  const smsHref = `sms:?body=${encodeURIComponent(shareBody)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <Link
        to="/zindule"
        className="inline-flex h-11 items-center gap-1.5 rounded-pill px-3 text-[15px] font-semibold text-apple-blue hover:underline print:hidden"
      >
        <ArrowLeft size={16} weight="bold" aria-hidden />
        {tr("back")}
      </Link>

      <header className="mt-4">
        <p className="text-label uppercase tracking-[0.14em]" style={{ color: accent }}>
          {guide.category.replace(/_/g, " ")}
        </p>
        <h1 className="mt-2 text-headline text-apple-ink">
          {guideTitle(guide, language)}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-pill px-3 py-1 text-[13px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            {tr(severityKey)}
          </span>
          {guide.audience && (
            <span className="text-[14px] font-medium text-apple-muted48">
              {fill(tr("audienceFor"), { audience: guide.audience })}
            </span>
          )}
        </div>
      </header>

      <div className="mt-6">
        <GuideBody guide={guide} lang={language} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 print:hidden">
        <a
          href={smsHref}
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-apple-blue px-4 text-[15px] font-semibold text-white active:scale-[0.97] transition-transform"
        >
          <EnvelopeSimple size={18} weight="fill" aria-hidden />
          {tr("sendToPhone")}
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-pill border border-surface-border bg-white px-4 text-[15px] font-semibold text-apple-ink active:scale-[0.97] transition-transform"
        >
          <Printer size={18} weight="fill" aria-hidden />
          {tr("printGuide")}
        </button>
      </div>

      <p className="mt-8 border-t border-surface-border pt-4 text-[14px] text-apple-muted48">
        {tr("disclaimer")}
      </p>
    </div>
  );
}