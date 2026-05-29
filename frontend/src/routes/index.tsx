import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

import { ProtectedRoute } from './ProtectedRoute.js';
import { DashboardLayout } from '../layouts/DashboardLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { CardSkeleton } from '../shared/ui/skeleton.js';

// Lazy load pages — keeps initial bundle small
const LoginPage      = lazy(() => import('../pages/auth/LoginPage.js'));
const OverviewPage   = lazy(() => import('../pages/dashboard/OverviewPage.js'));
const IncidentsPage  = lazy(() => import('../pages/dashboard/IncidentsPage.js'));
const AlertsPage     = lazy(() => import('../pages/dashboard/AlertsPage.js'));
const DevicesPage    = lazy(() => import('../pages/dashboard/DevicesPage.js'));
const UsersPage      = lazy(() => import('../pages/dashboard/UsersPage.js'));
const PoliciesPage   = lazy(() => import('../pages/dashboard/PoliciesPage.js'));
const AnalyticsPage  = lazy(() => import('../pages/dashboard/AnalyticsPage.js'));
const AuditPage      = lazy(() => import('../pages/dashboard/AuditPage.js'));
const SimulationPage = lazy(() => import('../pages/dashboard/SimulationPage.js'));
const SettingsPage   = lazy(() => import('../pages/dashboard/SettingsPage.js'));

function PageLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
        </Route>

        {/* Protected dashboard pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index          element={<OverviewPage />} />
          <Route path="incidents"  element={<IncidentsPage />} />
          <Route path="alerts"     element={<AlertsPage />} />
          <Route path="devices"    element={<DevicesPage />} />
          <Route path="users"      element={<UsersPage />} />
          <Route path="policies"   element={<PoliciesPage />} />
          <Route path="analytics"  element={<AnalyticsPage />} />
          <Route path="audit"      element={<AuditPage />} />
          <Route path="simulation" element={<SimulationPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
