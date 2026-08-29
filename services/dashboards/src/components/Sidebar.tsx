import { NavLink, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../hooks/useRedux";
import { logout } from "../store/dashboardSlice";
import { tokenStore } from "../services/api";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./design/LanguageToggle";
import { useT } from "./design/LanguageContext";
import type { StringKey } from "../i18n";
import { Icon, type IconName } from "./design/Icon";
import type { UserRole } from "../types";

type NavCategory = "operations" | "knowledge" | "analytics";

interface NavItem {
  to: string;
  label: string;
  labelKey: StringKey;
  icon: IconName;
  roles: UserRole[];
  category: NavCategory;
}

const ROLE_I18N: Record<UserRole, StringKey> = {
  dho: "roleDHO",
  mohp: "roleMOHP",
  chw: "roleCHW",
  phim: "rolePHIM",
  supervisor: "roleSupervisor",
};

const CATEGORY_TITLES: Record<NavCategory, string> = {
  operations: "Operations & Surveillance",
  knowledge: "Kuzisamala Knowledge",
  analytics: "Forecasting & Reports",
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dho", label: "DHO Dashboard", labelKey: "riskMap", icon: "MapPin", roles: ["dho"], category: "operations" },
  { to: "/mohp", label: "MoHP Dashboard", labelKey: "trends", icon: "ChartBar", roles: ["mohp", "phim"], category: "operations" },
  { to: "/chw", label: "CHW Dashboard", labelKey: "chws", icon: "Users", roles: ["chw"], category: "operations" },
  { to: "/surveillance/chw", label: "Field Surveillance", labelKey: "fieldSurveillance", icon: "Heartbeat", roles: ["mohp", "phim", "dho", "supervisor"], category: "operations" },
  { to: "/chuma", label: "CHUMA Forecasting", labelKey: "resourceForecast", icon: "Calculator", roles: ["mohp", "phim"], category: "analytics" },
  { to: "/samala", label: "Kuzisamala", labelKey: "knowledgeTranslation", icon: "BookOpen", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/search", label: "Research Library", labelKey: "researchSearch", icon: "MagnifyingGlass", roles: ["dho", "mohp", "phim", "supervisor", "chw"], category: "knowledge" },
  { to: "/samala/topics", label: "Knowledge Topics", labelKey: "knowledgeTopics", icon: "SquaresFour", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/assets", label: "Knowledge Assets", labelKey: "knowledgeAssets", icon: "FileText", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/heatmap", label: "Deployment Map", labelKey: "deploymentHeatmap", icon: "MapPin", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/impact", label: "Impact Trajectory", labelKey: "impactTrajectory", icon: "TrendUp", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/pipeline", label: "Pipeline", labelKey: "pipelineView", icon: "ArrowsSplit", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/samala/guides", label: "Self-Care Guides", labelKey: "selfCare", icon: "FirstAid", roles: ["dho", "mohp", "phim", "supervisor", "chw"], category: "knowledge" },
  { to: "/samala/pocket-cards", label: "Pocket Cards", labelKey: "pocketCards", icon: "SquaresFour", roles: ["dho", "mohp", "phim", "supervisor", "chw"], category: "knowledge" },
  { to: "/samala/flipbook", label: "Flipbook", labelKey: "flipbook", icon: "BookOpen", roles: ["dho", "mohp", "phim", "supervisor", "chw"], category: "knowledge" },
  { to: "/samala/export", label: "Export & Print", labelKey: "exportPrint", icon: "Download", roles: ["dho", "mohp", "phim", "supervisor"], category: "knowledge" },
  { to: "/reports", label: "Reports", labelKey: "reports", icon: "FileText", roles: ["dho", "mohp", "phim", "supervisor"], category: "analytics" },
];

export function Sidebar() {
  const { role, user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const t = useT();
  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  const categories: NavCategory[] = ["operations", "knowledge", "analytics"];
  const showCategories = visibleItems.length > 5;

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="sidebar-brand-info">
          <h2>{t("appName")}</h2>
          <span className="sidebar-badge">Malawi Health Ops</span>
        </div>
      </div>

      <div className="sidebar-nav-container">
        {showCategories ? (
          categories.map((cat) => {
            const catItems = visibleItems.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="sidebar-section">
                <div className="sidebar-section-title">{CATEGORY_TITLES[cat]}</div>
                <ul className="sidebar-nav">
                  {catItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          isActive ? "sidebar-link active" : "sidebar-link"
                        }
                      >
                        <span className="sidebar-link-icon">
                          <Icon name={item.icon} size={18} />
                        </span>
                        <span className="sidebar-link-text">{t(item.labelKey)}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        ) : (
          <ul className="sidebar-nav">
            {visibleItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link active" : "sidebar-link"
                  }
                >
                  <span className="sidebar-link-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="sidebar-link-text">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              <Icon name="Person" size={18} color="var(--color-primary)" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{t(ROLE_I18N[role ?? "chw"])}</span>
            </div>
          </div>
        )}
        <div className="sidebar-toggles">
          <LanguageToggle variant="compact" />
          <ThemeToggle />
        </div>
        <button
          className="sidebar-link sidebar-logout"
          onClick={() => {
            dispatch(logout());
            tokenStore.clear();
            navigate("/login", { replace: true });
          }}
        >
          <Icon name="SignOut" size={18} />
          <span>{t("signOut")}</span>
        </button>
      </div>
    </nav>
  );
}
