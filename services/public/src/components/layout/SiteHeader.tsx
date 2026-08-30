import { Link } from "react-router-dom";
import { Leaf } from "@phosphor-icons/react";
import { useT } from "../design/LanguageContext";
import { LanguageToggle } from "../design/LanguageToggle";

/** Wordmark + flat nav + language toggle. Clay rule echoes the notice-board
 * world; only one accent per view (nav is text, not chrome). */
export function SiteHeader() {
  const t = useT();
  const links = [
    { to: "/zindule", label: t("navGuides"), key: "guides" },
    { to: "/dziko-lathu", label: t("navDistrict"), key: "district" },
    { to: "/thandizo", label: t("navHelp"), key: "help" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-surface-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Samala — home">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-clay text-white">
              <Leaf size={22} weight="fill" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-title text-apple-ink">
                {t("appName")}
              </span>
              <span className="text-[11px] font-medium text-apple-muted48">
                {t("communityNotice")}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                className="flex h-11 items-center rounded-pill px-3.5 text-[15px] font-medium text-apple-ink hover:bg-surface-card transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}