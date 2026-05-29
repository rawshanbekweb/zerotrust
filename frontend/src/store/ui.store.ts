import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Notification {
  id:       string;
  type:     'success' | 'error' | 'warning' | 'info';
  title:    string;
  message?: string;
}

interface UIState {
  theme:             'dark' | 'light';
  sidebarCollapsed:  boolean;
  notifications:     Notification[];

  toggleTheme:        () => void;
  setTheme:           (theme: 'dark' | 'light') => void;
  toggleSidebar:      () => void;
  setSidebarCollapsed:(v: boolean) => void;
  addNotification:    (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme:            'dark',
      sidebarCollapsed: false,
      notifications:    [],

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setSidebarCollapsed: (v) =>
        set({ sidebarCollapsed: v }),

      addNotification: (n) =>
        set((s) => ({
          notifications: [
            ...s.notifications,
            { ...n, id: crypto.randomUUID() },
          ],
        })),

      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name:       'zerotrust-ui',
      storage:    createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
