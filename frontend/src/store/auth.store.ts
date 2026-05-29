import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto, AuthTokens } from '../shared/types/index.js';

interface AuthState {
  user:            UserDto | null;
  tokens:          AuthTokens | null;
  isAuthenticated: boolean;
  isInitializing:  boolean;

  setAuth:          (user: UserDto, tokens: AuthTokens) => void;
  setUser:          (user: UserDto) => void;
  setTokens:        (tokens: AuthTokens) => void;
  clearAuth:        () => void;
  setInitializing:  (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      tokens:          null,
      isAuthenticated: false,
      isInitializing:  true,

      setAuth: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true, isInitializing: false }),

      setUser: (user) =>
        set({ user }),

      setTokens: (tokens) =>
        set({ tokens }),

      clearAuth: () =>
        set({ user: null, tokens: null, isAuthenticated: false, isInitializing: false }),

      setInitializing: (v) =>
        set({ isInitializing: v }),
    }),
    {
      name:    'zerotrust-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist tokens — user profile is re-fetched on load
      partialize: (state) => ({ tokens: state.tokens }),
    },
  ),
);
