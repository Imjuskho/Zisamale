import { NavLink } from "react-router-dom";
import { useAppSelector } from "../hooks/useRedux";
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
  const { role } = useAppSelector((s) => s.auth);

  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
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
        <ThemeToggle />
        <NavLink to="/login" className="sidebar-link sidebar-logout">
          Log Out
        </NavLink>
      </div>
    </nav>
  );
}
