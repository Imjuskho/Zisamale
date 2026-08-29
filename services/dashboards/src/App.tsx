import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAppSelector } from "./hooks/useRedux";
import { Sidebar } from "./components/Sidebar";
import { Icon, type IconName } from "./components/design/Icon";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SkeletonDashboard } from "./components/design/Skeleton";
import { OfflineBanner } from "./components/OfflineBanner";
import type { UserRole } from "./types";

const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const DHODashboard = lazy(() => import("./pages/DHODashboard").then((m) => ({ default: m.DHODashboard })));
const MoHPDashboard = lazy(() => import("./pages/MoHPDashboard").then((m) => ({ default: m.MoHPDashboard })));
const CHWDashboard = lazy(() => import("./pages/CHWDashboard").then((m) => ({ default: m.CHWDashboard })));
const CHUMADashboard = lazy(() => import("./pages/CHUMADashboard").then((m) => ({ default: m.CHUMADashboard })));
const CHWSurveillanceDashboard = lazy(() => import("./pages/CHWSurveillanceDashboard"));
const DataGapReportPage = lazy(() => import("./pages/DataGapReportPage"));
const SAMALADashboard = lazy(() => import("./pages/SAMALADashboard").then((m) => ({ default: m.SAMALADashboard })));
const ResearchSearchPage = lazy(() => import("./pages/ResearchSearchPage").then((m) => ({ default: m.ResearchSearchPage })));
const SelfCareLibraryPage = lazy(() => import("./pages/SelfCareLibraryPage").then((m) => ({ default: m.SelfCareLibraryPage })));
const ReportHub = lazy(() => import("./pages/ReportHub"));
const DistrictHealthReport = lazy(() => import("./pages/DistrictHealthReport"));
const SAMALAReport = lazy(() => import("./pages/SAMALAReport"));
const KnowledgeTopicBrowser = lazy(() => import("./pages/KnowledgeTopicBrowser").then((m) => ({ default: m.KnowledgeTopicBrowser })));
const AssetPreviewPage = lazy(() => import("./pages/AssetPreviewPage").then((m) => ({ default: m.AssetPreviewPage })));
const DeploymentHeatmap = lazy(() => import("./pages/DeploymentHeatmap").then((m) => ({ default: m.DeploymentHeatmap })));
const ImpactTrajectory = lazy(() => import("./pages/ImpactTrajectory").then((m) => ({ default: m.ImpactTrajectory })));
const PipelineView = lazy(() => import("./pages/PipelineView").then((m) => ({ default: m.PipelineView })));
const PDFExportPage = lazy(() => import("./pages/PDFExportPage").then((m) => ({ default: m.PDFExportPage })));
const PocketCardPage = lazy(() => import("./pages/PocketCardPage").then((m) => ({ default: m.PocketCardPage })));
const FlipbookPage = lazy(() => import("./pages/FlipbookPage").then((m) => ({ default: m.FlipbookPage })));

function PageLoader() {
  return (
    <div className="p-6">
      <SkeletonDashboard />
    </div>
  );
}

const MOBILE_NAV_ITEMS: Record<UserRole, Array<{ to: string; label: string; icon: IconName }>> = {
  dho: [
    { to: "/dho", label: "Overview", icon: "House" },
    { to: "/surveillance/chw", label: "Surveillance", icon: "Heartbeat" },
    { to: "/reports", label: "Reports", icon: "FileText" },
  ],
  mohp: [
    { to: "/mohp", label: "Overview", icon: "ChartBar" },
    { to: "/chuma", label: "Forecast", icon: "Calculator" },
    { to: "/reports", label: "Reports", icon: "FileText" },
  ],
  phim: [
    { to: "/mohp", label: "Overview", icon: "ChartBar" },
    { to: "/chuma", label: "Forecast", icon: "Calculator" },
    { to: "/reports", label: "Reports", icon: "FileText" },
  ],
  chw: [
    { to: "/chw", label: "My work", icon: "House" },
    { to: "/samala/guides", label: "Guides", icon: "FirstAid" },
    { to: "/samala/pocket-cards", label: "Cards", icon: "SquaresFour" },
  ],
  supervisor: [
    { to: "/dho", label: "Overview", icon: "House" },
    { to: "/surveillance/chw", label: "Surveillance", icon: "Heartbeat" },
    { to: "/samala/guides", label: "Guides", icon: "FirstAid" },
  ],
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAppSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <OfflineBanner />
      <Sidebar />
      <main id="main-content" className="main-content">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <nav className="mobile-nav" aria-label="Main navigation">
        {(role ? MOBILE_NAV_ITEMS[role] : []).map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "active" : ""}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dho"
              element={
                <ProtectedRoute>
                  <DHODashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mohp"
              element={
                <ProtectedRoute>
                  <MoHPDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chw"
              element={
                <ProtectedRoute>
                  <CHWDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chuma"
              element={
                <ProtectedRoute>
                  <CHUMADashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/surveillance/chw"
              element={
                <ProtectedRoute>
                  <CHWSurveillanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/data-gap"
              element={
                <ProtectedRoute>
                  <DataGapReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/district-health"
              element={
                <ProtectedRoute>
                  <DistrictHealthReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/samala-impact"
              element={
                <ProtectedRoute>
                  <SAMALAReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala"
              element={
                <ProtectedRoute>
                  <SAMALADashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/search"
              element={
                <ProtectedRoute>
                  <ResearchSearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/guides"
              element={
                <ProtectedRoute>
                  <SelfCareLibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/topics"
              element={
                <ProtectedRoute>
                  <KnowledgeTopicBrowser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/assets"
              element={
                <ProtectedRoute>
                  <AssetPreviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/heatmap"
              element={
                <ProtectedRoute>
                  <DeploymentHeatmap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/impact"
              element={
                <ProtectedRoute>
                  <ImpactTrajectory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/pipeline"
              element={
                <ProtectedRoute>
                  <PipelineView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/export"
              element={
                <ProtectedRoute>
                  <PDFExportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/pocket-cards"
              element={
                <ProtectedRoute>
                  <PocketCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/samala/flipbook"
              element={
                <ProtectedRoute>
                  <FlipbookPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
