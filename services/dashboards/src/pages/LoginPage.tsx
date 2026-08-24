import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { login } from "../store/dashboardSlice";
import { api } from "../services/api";
import { t } from "../i18n";
import type { UserRole } from "../types";

const ROLE_LABELS: Record<UserRole, string> = {
  dho: "District Health Officer",
  mohp: "Ministry of Health Policy",
  chw: "Community Health Worker",
  phim: "Public Health Information Manager",
};

const ROLE_ROUTES: Record<UserRole, string> = {
  dho: "/dho",
  mohp: "/mohp",
  chw: "/chw",
  phim: "/mohp",
};

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("dho");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      const stored = localStorage.getItem("zisamale-role") as UserRole | null;
      navigate(ROLE_ROUTES[stored ?? "dho"], { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    try {
      const data = await api.login(email.trim(), password);
      const role = (data.user?.role || data.role) as UserRole;
      const user = data.user
        ? {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role,
            district: data.user.district ?? data.district_id ?? undefined,
          }
        : {
            id: data.user_id,
            name: data.user_id,
            email: email.trim(),
            role,
            district: data.district_id ?? undefined,
          };
      dispatch(login({ user, token: data.access_token }));
      navigate(ROLE_ROUTES[role] ?? ROLE_ROUTES.dho, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="login-page" style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>{t("appName")}</h1>
      <p className="login-subtitle">{t("welcome", "ny")}</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-email" style={{ display: "block", marginBottom: 4 }}>
            {t("email")}
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-password" style={{ display: "block", marginBottom: 4 }}>
            {t("password")}
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            autoComplete="current-password"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-role" style={{ display: "block", marginBottom: 4 }}>
            Role
          </label>
          <select
            id="login-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            style={{ width: "100%", padding: 8 }}
          >
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          {t("signIn")}
        </button>
      </form>
    </div>
  );
}
