import { NavLink, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../hooks/useRedux";
import { logout } from "../store/dashboardSlice";
import { tokenStore } from "../services/api";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./design/LanguageToggle";
import { t, type StringKey } from "../i18n";
import { Icon, type IconName } from "./design/Icon";
import type { UserRole } from "../types";

interface NavItem {
  to: string;
  label: string;
  labelKey: StringKey;
  icon: IconName;
  roles: UserRole[];
}

const ROLE_I18N: Record<UserRole, StringKey> = {
  dho: "roleDHO",
  mohp: "roleMOHP",
  chw: "roleCHW",
  phim: "rolePHIM",
  supervisor: "roleSupervisor",
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dho", label: "DHO Dashboard", labelKey: "riskMap", icon: "MapPin", roles: ["dho"] },
  { to: "/mohp", label: "MoHP Dashboard", labelKey: "trends", icon: "ChartBar", roles: ["mohp", "phim"] },
  { to: "/chw", label: "CHW Dashboard", labelKey: "chws", icon: "Users", roles: ["chw"] },
  { to: "/chuma", label: "CHUMA Forecasting", labelKey: "resourceForecast", icon: "Calculator", roles: ["mohp", "phim"] },
];

export function Sidebar() {
  const { role, user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">Z</div>
        <h2>{t("appName")}</h2>
      </div>
      <ul className="sidebar-nav">
        {visibleItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              <span className="sidebar-link-sub">{t(item.labelKey, "ny")}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              <Icon name="Person" size={20} color="#fff" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{t(ROLE_I18N[role ?? "chw"], "ny")}</span>
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
          <Icon name="SignOut" size={20} />
          {t("signOut")}
        </button>
      </div>
    </nav>
  );
}
