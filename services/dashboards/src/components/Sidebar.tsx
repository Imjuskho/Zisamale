import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../hooks/useRedux";
import { logout } from "../store/dashboardSlice";
import { tokenStore } from "../services/api";
import { t } from "../i18n";

const ROLE_NAV: Record<string, { label: string; icon: string; path: string }[]> = {
  dho: [
    { label: "Alerts", icon: "🔔", path: "/dho" },
    { label: "Risk Map", icon: "🗺️", path: "/dho/map" },
    { label: "CHWs", icon: "👥", path: "/dho/chws" },
    { label: "Trends", icon: "📈", path: "/dho/trends" },
  ],
  mohp: [
    { label: "Overview", icon: "📊", path: "/mohp" },
    { label: "Districts", icon: "🏘️", path: "/mohp/districts" },
    { label: "Forecast", icon: "📈", path: "/mohp/forecast" },
  ],
  chw: [
    { label: "Today", icon: "📋", path: "/chw" },
    { label: "My Stats", icon: "📊", path: "/chw/stats" },
  ],
  phim: [
    { label: "Overview", icon: "📊", path: "/mohp" },
    { label: "Data Quality", icon: "✅", path: "/mohp/quality" },
  ],
};

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { darkMode } = useAppSelector((s) => s.theme);

  const role = user?.role ?? "dho";
  const items = ROLE_NAV[role] ?? ROLE_NAV.dho;

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-200 ${
        darkMode ? "bg-zisamale-dark text-white" : "bg-white text-zisamale-dark"
      }`}
      style={{ width: 280, borderRight: "1px solid var(--color-border)" }}
    >
      {/* Brand */}
      <div className="p-5 border-b border-surface-divider">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zisamale-green flex items-center justify-center text-white font-bold text-lg">
            Z
          </div>
          <div>
            <h1 className="text-title font-bold">Zisamale</h1>
            <p className="text-label text-neutral capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/dho" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full ${isActive ? "nav-item-active" : "nav-item-inactive"} rounded-xl`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-surface-divider">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-zisamale-green-light flex items-center justify-center text-zisamale-green font-bold">
            {user?.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium truncate">{user?.name}</p>
            <p className="text-label text-neutral truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            dispatch(logout());
            tokenStore.clear();
            navigate("/login", { replace: true });
          }}
          className="btn-ghost w-full justify-center text-risk-critical hover:bg-risk-critical-light"
        >
          {t("signOut")}
        </button>
      </div>
    </aside>
  );
}
