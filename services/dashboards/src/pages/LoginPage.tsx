import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { login } from "../store/dashboardSlice";
import { api } from "../services/api";
import type { UserRole } from "../types";
import { t } from "../i18n";

const ROLE_OPTIONS: { value: UserRole; labelCy: string; labelEn: string }[] = [
  { value: "mohp", labelCy: "Ofesi ya Zaumoyo", labelEn: "Ministry of Health" },
  { value: "dho", labelCy: "Woyang'anira Zaumoyo", labelEn: "District Health Officer" },
  { value: "chw", labelCy: "ASHA", labelEn: "Community Health Worker" },
  { value: "phim", labelCy: "Woyang'anira Nkhokwe", labelEn: "Health Info Manager" },
];

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
  const { darkMode } = useAppSelector((s) => s.theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("dho");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    const stored = localStorage.getItem("zisamale-role") as UserRole | null;
    navigate(ROLE_ROUTES[stored ?? "dho"], { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email ndi mawu achinsinsi ndi ofunikira");
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      const userRole = (data.user?.role || data.role) as UserRole;
      const user = data.user
        ? { id: data.user.id, name: data.user.name, email: data.user.email, role: userRole, district: data.user.district ?? data.district_id ?? undefined }
        : { id: data.user_id, name: data.user_id, email: email.trim(), role: userRole, district: data.district_id ?? undefined };
      dispatch(login({ user, token: data.access_token }));
      navigate(ROLE_ROUTES[userRole] ?? ROLE_ROUTES.dho, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vuto la kulowa. Yesereni.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-zisamale-green flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4 shadow-elevated">
            Z
          </div>
          <h1 className="text-headline font-bold text-zisamale-dark">Zisamale</h1>
          <p className="text-body text-neutral mt-1">Takulandirani ku Zisamale!</p>
          <p className="text-caption text-neutral/70">Welcome to Zisamale</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card rounded-xl p-6">
          {/* Email */}
          <div className="mb-4">
            <label htmlFor="login-email" className="text-caption font-medium text-neutral mb-2 block">
              {t("email")}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              autoComplete="username"
              placeholder="dho@nsanje.gov.mw"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="login-password" className="text-caption font-medium text-neutral mb-2 block">
              {t("password")}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoComplete="current-password"
            />
          </div>

          {/* Role */}
          <div className="mb-6">
            <label htmlFor="login-role" className="text-caption font-medium text-neutral mb-2 block">
              Mawu a ntchito / Role
            </label>
            <select
              id="login-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input-field cursor-pointer"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.labelCy} — {r.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-risk-critical-light text-risk-critical text-body p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lowelani...
              </span>
            ) : (
              t("signIn")
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-caption text-neutral mt-6">
          Mwayi wabwino! Zisamale ndi chida chanu.
          <br />
          <span className="text-neutral/60">Good luck! Zisamale is your tool.</span>
        </p>
      </div>
    </div>
  );
}
