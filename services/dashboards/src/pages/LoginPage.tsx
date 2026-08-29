import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { login } from "../store/dashboardSlice";
import { api } from "../services/api";
import { t } from "../i18n";
import { ParticleCanvas } from "../components/particles/ParticleCanvas";
import { generateMalawiPoints } from "../components/particles/malawiMap";
import type { UserRole } from "../types";

const ROLE_ROUTES: Record<UserRole, string> = {
  dho: "/dho",
  mohp: "/mohp",
  chw: "/chw",
  phim: "/mohp",
  supervisor: "/dho",
};

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sessionExpired = searchParams.get("expired") === "1";

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Generate Malawi map outline points for particle attraction
  const malawiTargets = useMemo(() => generateMalawiPoints(220), []);

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

    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Brand panel with particle canvas */}
      <aside className="login-hero" aria-hidden="true">
        <ParticleCanvas dark config={{ count: 220 }} mapTargets={malawiTargets} />

        {/* Ambient light layer */}
        <div className="login-hero-ambient" />

        <div className={`login-hero-brand ${mounted ? "login-anim-in" : ""}`} style={{ animationDelay: "0ms" }}>
          <span className="login-hero-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="login-hero-wordmark">Zisamale</span>
        </div>

        <div className={`login-hero-copy ${mounted ? "login-anim-in" : ""}`} style={{ animationDelay: "120ms" }}>
          <h2>Community health, connected.</h2>
          <p>
            Live maps, referral routing, outbreak prediction and cold-chain
            monitoring for every district in Malawi.
          </p>

          <ul className="login-hero-points">
            <li className={`${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "280ms" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              771 registered health facilities
            </li>
            <li className={`${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "360ms" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Offline-first CHW visit capture
            </li>
            <li className={`${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "440ms" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Real-time outbreak &amp; climate alerts
            </li>
          </ul>
        </div>

        <div className={`login-hero-footer ${mounted ? "login-anim-in" : ""}`} style={{ animationDelay: "520ms" }}>
          Ministry of Health · Republic of Malawi
        </div>
      </aside>

      {/* Form panel — frosted glass */}
      <main className="login-card-zone">
        <div className={`login-page ${mounted ? "login-form-anim" : ""}`}>
          <div className="login-mobile-brand">
            <span className="login-hero-logo login-hero-logo--small">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </div>
          <h1 className={`${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "80ms" }}>
            {t("appName")}
          </h1>
          <p className={`login-subtitle ${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "140ms" }}>
            {t("welcome", "ny")}
          </p>

          {sessionExpired && (
            <p className="login-session-expired login-anim-slide" role="alert" style={{ animationDelay: "180ms" }}>
              Your session expired. Please sign in again.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className={`login-field ${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "200ms" }}>
              <label htmlFor="login-email">{t("email")}</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><MailIcon /></span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@health.gov.mw"
                />
              </div>
            </div>

            <div className={`login-field ${mounted ? "login-anim-slide" : ""}`} style={{ animationDelay: "260ms" }}>
              <label htmlFor="login-password">{t("password")}</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><LockIcon /></span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="m1 1 22 22" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="login-error login-shake">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`login-submit-btn ${mounted ? "login-anim-slide" : ""}`}
              style={{ animationDelay: "320ms" }}
            >
              {submitting ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                t("signIn")
              )}
            </button>
          </form>

          <p className={`login-footnote ${mounted ? "login-anim-in" : ""}`} style={{ animationDelay: "380ms" }}>
            Protected health system · Unauthorised access is prohibited
          </p>
        </div>
      </main>
    </div>
  );
}
