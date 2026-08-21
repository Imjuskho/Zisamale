import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { toggleDarkMode } from "../store/dashboardSlice";

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSelector((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <button
      className="theme-toggle"
      onClick={() => dispatch(toggleDarkMode())}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
