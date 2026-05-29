import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';

// Auth pages (login, register) — redirect to dashboard if already authenticated
export function AuthLayout() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <Outlet />
    </div>
  );
}
