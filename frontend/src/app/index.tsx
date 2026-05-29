import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppRoutes } from '../routes/index.js';
import { useAuthStore } from '../store/auth.store.js';
import { useUIStore } from '../store/ui.store.js';
import { authApi } from '../shared/api/auth.api.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,  // 5 minutes
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { tokens, setAuth, clearAuth, setInitializing } = useAuthStore();
  const { theme } = useUIStore();

  // Apply the stored theme class immediately on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // On first load: if we have a token in localStorage, validate it by fetching profile.
  // This handles page refreshes — the token may have been revoked server-side.
  useEffect(() => {
    if (!tokens?.accessToken) {
      setInitializing(false);
      return;
    }

    authApi
      .getProfile()
      .then((user) => {
        setAuth(user, tokens);
      })
      .catch(() => {
        clearAuth();
      });
  // Intentionally no dependency on tokens — runs once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <AppRoutes />
        </AuthInitializer>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
