import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { Skeleton } from '../shared/ui/skeleton.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  // While we're verifying the stored token on first load
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-base">
        <div className="space-y-3 w-64">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role.name)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
