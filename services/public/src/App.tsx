import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { LanguageProvider } from "./components/design/LanguageContext";
import { DistrictProvider } from "./components/design/DistrictContext";
import { SiteHeader } from "./components/layout/SiteHeader";
import { EmergencyStrip } from "./components/design/EmergencyStrip";
import { HomePage } from "./pages/HomePage";
import { GuidesPage } from "./pages/GuidesPage";
import { GuideDetailPage } from "./pages/GuideDetailPage";
import { DistrictPage } from "./pages/DistrictPage";
import { HelpPage } from "./pages/HelpPage";

function Shell() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-bg text-apple-ink">
      <SiteHeader />
      <EmergencyStrip />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-surface-divider py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-[13px] text-apple-muted48">
          Samala · Zisamale community health
        </div>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "zindule", element: <GuidesPage /> },
      { path: "zindule/:guideId", element: <GuideDetailPage /> },
      { path: "dziko-lathu", element: <DistrictPage /> },
      { path: "thandizo", element: <HelpPage /> },
    ],
  },
]);

export default function App() {
  return (
    <LanguageProvider>
      <DistrictProvider>
        <RouterProvider router={router} />
      </DistrictProvider>
    </LanguageProvider>
  );
}