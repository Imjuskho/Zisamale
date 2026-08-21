import { NavLink, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../hooks/useRedux";
import { logout } from "../store/dashboardSlice";
import { tokenStore } from "../services/api";
import { ThemeToggle } from "./ThemeToggle";
import type { UserRole } from "../types";

interface NavItem {
  to: string;
  label: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dho", label: "DHO Dashboard", roles: ["dho"] },
  { to: "/mohp", label: "MoHP Dashboard", roles: ["mohp", "phim"] },
  { to: "/chw", label: "CHW Dashboard", roles: ["chw"] },
  { to: "/chuma", label: "CHUMA Forecasting", roles: ["mohp", "phim"] },
];

export function Sidebar() {
  const { role, user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo">Z</div>
        <h2>Zisamale</h2>
      </div>
      <ul className="sidebar-nav">
        {visibleItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.name?.charAt(0) ?? "?"}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{role}</span>
            </div>
          </div>
        )}
        <ThemeToggle />
        <button
          className="sidebar-link sidebar-logout"
          onClick={() => {
            dispatch(logout());
            tokenStore.clear();
            navigate("/login", { replace: true });
          }}
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
