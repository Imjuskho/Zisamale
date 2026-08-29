import { useNavigate } from "react-router-dom";
import { Icon, type IconName } from "../components/design/Icon";
import { useT } from "../components/design/LanguageContext";
import type { StringKey } from "../i18n";
import { useAppSelector } from "../hooks/useRedux";

interface ReportCard {
  titleKey: StringKey;
  descKey: StringKey;
  icon: IconName;
  iconColor: string;
  path: string;
  roles: string[];
  tags: string[];
}

const REPORTS: ReportCard[] = [
  {
    titleKey: "reportDistrictHealth",
    descKey: "reportDistrictHealthDesc",
    icon: "ChartBar",
    iconColor: "#2D6A4F",
    path: "/reports/district-health",
    roles: ["dho", "mohp", "phim", "supervisor"],
    tags: ["Surveillance", "CHW Activity", "Monthly"],
  },
  {
    titleKey: "reportSAMALA",
    descKey: "reportSAMALADesc",
    icon: "BookOpen",
    iconColor: "#7C3AED",
    path: "/reports/samala-impact",
    roles: ["dho", "mohp", "phim"],
    tags: ["SAMALA-AI", "Research", "Impact"],
  },
  {
    titleKey: "reportFieldIntel",
    descKey: "reportFieldIntelDesc",
    icon: "FileText",
    iconColor: "#ff9500",
    path: "/reports/data-gap",
    roles: ["mohp", "phim"],
    tags: ["Grant Reporting", "Data Quality", "AI Performance"],
  },
];

function monthLabel(date = new Date()): string {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export default function ReportHub() {
  const t = useT();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);

  const visible = REPORTS.filter((r) => role && r.roles.includes(role));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{t("reports")}</p>
          <h1>{t("reportHubTitle")}</h1>
          <p className="text-body text-neutral mt-1">
            {t("reportHubSubtitle")} &mdash; {monthLabel()}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {visible.map((report) => (
          <button
            key={report.path}
            type="button"
            onClick={() => navigate(report.path)}
            className="card rounded-xl p-6 text-left hover:shadow-lg transition-all duration-200 group cursor-pointer border border-transparent hover:border-surface-strong"
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${report.iconColor}14` }}
            >
              <Icon name={report.icon} size={24} color={report.iconColor} />
            </div>
            <h3 className="text-title font-semibold mb-2 group-hover:text-apple-blue transition-colors">
              {t(report.titleKey)}
            </h3>
            <p className="text-caption text-neutral mb-4 leading-relaxed">
              {t(report.descKey)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-label bg-neutral-50 text-neutral px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">{t("reportQuickStats")}</h2>
        <div className="card rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-data text-apple-blue">15</p>
              <p className="text-caption text-neutral mt-1">{t("reportStudiesIngested")}</p>
            </div>
            <div className="text-center">
              <p className="text-data text-apple-blue">20</p>
              <p className="text-caption text-neutral mt-1">{t("reportAssetsCreated")}</p>
            </div>
            <div className="text-center">
              <p className="text-data" style={{ color: "#7C3AED" }}>5</p>
              <p className="text-caption text-neutral mt-1">{t("reportGuidesAvailable")}</p>
            </div>
            <div className="text-center">
              <p className="text-data" style={{ color: "#ff9500" }}>5</p>
              <p className="text-caption text-neutral mt-1">{t("reportTalksReady")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Report History Placeholder */}
      <section>
        <h2 className="text-title font-semibold mb-4">{t("reportGenerationNote")}</h2>
        <div className="card rounded-xl p-6 text-center">
          <Icon name="Info" size={32} color="var(--color-neutral)" className="mx-auto mb-3" />
          <p className="text-body text-neutral max-w-lg mx-auto">
            {t("reportGenerationNoteBody")}
          </p>
        </div>
      </section>
    </div>
  );
}
