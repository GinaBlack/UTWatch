import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useAuth, UserRole } from "@/components/ThemeProvider";
import { VisionProvider } from "@/components/VisionProvider";
import { useSystemConfig } from "@/hooks/use-system-config";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AdminRegistrationPage from "./pages/AdminRegistrationPage";
import VerificationPage from "./pages/VerificationPage";
import Dashboard from "./pages/Dashboard";
import MapViewPage from "./pages/MapViewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotificationsPage from "./pages/NotificationsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import UserManagementPage from "./pages/UserManagementPage";
import ReportsPage from "./pages/ReportsPage";
import CamerasPage from "./pages/CamerasPage";
import RecordingsPage from "./pages/RecordingsPage";
import SystemLogsPage from "./pages/SystemLogsPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import SystemSetupPage from "./pages/SystemSetupPage";
import SystemUnderSetupPage from "./pages/SystemUnderSetupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { config: systemConfig, loading: configLoading } = useSystemConfig();
  const location = useLocation();

  if (loading || configLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  if (!systemConfig?.initialized) {
    if (user.role === "Administrator") {
      if (location.pathname !== "/setup") return <Navigate to="/setup" replace />;
    } else {
      if (location.pathname !== "/under-setup") return <Navigate to="/under-setup" replace />;
    }
  }

  if (!user.emailVerified && user.email) {
    return <Navigate to="/verification" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/admin-register" element={<AdminRegistrationPage />} />
    <Route path="/verification" element={<VerificationPage />} />
    <Route path="/unauthorized" element={<UnauthorizedPage />} />
    <Route path="/under-setup" element={<SystemUnderSetupPage />} />
    <Route path="/setup" element={
      <ProtectedRoute allowedRoles={["Administrator"]}>
        <SystemSetupPage />
      </ProtectedRoute>
    } />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/map" element={<ProtectedRoute><MapViewPage /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
    <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
    
    <Route path="/cameras" element={
      <ProtectedRoute allowedRoles={["Administrator"]}>
        <CamerasPage />
      </ProtectedRoute>
    } />

    <Route path="/recordings" element={
      <ProtectedRoute allowedRoles={["Administrator", "Traffic Officer"]}>
        <RecordingsPage />
      </ProtectedRoute>
    } />

    <Route path="/analytics" element={
      <ProtectedRoute allowedRoles={["Administrator", "Traffic Officer"]}>
        <AnalyticsPage />
      </ProtectedRoute>
    } />
    
    <Route path="/reports" element={
      <ProtectedRoute allowedRoles={["Administrator", "Traffic Officer"]}>
        <ReportsPage />
      </ProtectedRoute>
    } />
    
    <Route path="/logs" element={
      <ProtectedRoute allowedRoles={["Administrator"]}>
        <SystemLogsPage />
      </ProtectedRoute>
    } />
    
    <Route path="/settings" element={
      <ProtectedRoute allowedRoles={["Administrator"]}>
        <SettingsPage />
      </ProtectedRoute>
    } />
    
    <Route path="/users" element={
      <ProtectedRoute allowedRoles={["Administrator"]}>
        <UserManagementPage />
      </ProtectedRoute>
    } />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <VisionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </VisionProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
