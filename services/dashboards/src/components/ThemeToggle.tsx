import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { toggleDarkMode } from "../store/dashboardSlice";
import { Icon } from "./design/Icon";

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSelector((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <button
      className="sidebar-link"
      onClick={() => dispatch(toggleDarkMode())}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon name={darkMode ? "Sun" : "Moon"} size={20} />
      <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}
