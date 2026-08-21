import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppSelector } from "./hooks/useRedux";
import { LoginPage } from "./pages/LoginPage";
import { DHODashboard } from "./pages/DHODashboard";
import { MoHPDashboard } from "./pages/MoHPDashboard";
import { CHUMADashboard } from "./pages/CHUMADashboard";
import { Sidebar } from "./components/Sidebar";


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-surface-bg">
      <Sidebar />
      <main className="flex-1 ml-[280px] p-6 max-w-[1400px]">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
              <DHODashboard />
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
