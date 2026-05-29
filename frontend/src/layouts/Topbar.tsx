import { useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Sun, Moon, Search, ChevronRight, Shield, Menu, X,
  ShieldAlert, AlertTriangle, Info,
} from 'lucide-react';
import { cn } from '../shared/utils/cn.js';
import { useUIStore } from '../store/ui.store.js';
import { useAuthStore } from '../store/auth.store.js';
import { Avatar } from '../shared/ui/avatar.js';
import { Badge } from '../shared/ui/badge.js';
import { timeAgo } from '../shared/utils/format.js';

// ─── Breadcrumb map ───────────────────────────────────────────

const BREADCRUMBS: Record<string, { label: string; parent?: string }> = {
  '/dashboard':            { label: 'Overview' },
  '/dashboard/incidents':  { label: 'Incidents', parent: 'Security' },
  '/dashboard/alerts':     { label: 'Alerts', parent: 'Security' },
  '/dashboard/devices':    { label: 'Devices', parent: 'Identity' },
  '/dashboard/users':      { label: 'Users & Roles', parent: 'Identity' },
  '/dashboard/policies':   { label: 'Policies', parent: 'Control' },
  '/dashboard/analytics':  { label: 'Analytics', parent: 'Analysis' },
  '/dashboard/audit':      { label: 'Audit Logs', parent: 'Analysis' },
  '/dashboard/simulation': { label: 'Attack Simulation', parent: 'Security' },
  '/dashboard/settings':   { label: 'Settings', parent: 'System' },
};

// ─── Mock notification data (replaced by real API in Phase 8) ─

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Critical Alert', message: 'Brute force attack detected from 185.220.101.42', severity: 'CRITICAL' as const, time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), read: false },
  { id: '2', title: 'Impossible Travel', message: 'User authenticated from 2 countries in 33 minutes', severity: 'HIGH' as const, time: new Date(Date.now() - 18 * 60 * 1000).toISOString(), read: false },
  { id: '3', title: 'New Device Registered', message: 'Unrecognized device login for s.mirzayev', severity: 'MEDIUM' as const, time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), read: true },
];

export function Topbar() {
  const location  = useLocation();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user }  = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused]         = useState(false);

  const crumb    = BREADCRUMBS[location.pathname];
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-700/50 bg-surface-elevated/70 backdrop-blur-xl px-6 gap-4">
      {/* Left — mobile menu + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-slate-400 hover:text-slate-200 p-1"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Shield className="h-4 w-4 text-brand-400 shrink-0" />
          {crumb?.parent && (
            <>
              <span className="text-slate-600 truncate hidden sm:block">{crumb.parent}</span>
              <ChevronRight className="h-3 w-3 text-slate-700 shrink-0 hidden sm:block" />
            </>
          )}
          <span className="font-medium text-slate-200 truncate">
            {crumb?.label ?? 'Dashboard'}
          </span>
        </nav>
      </div>

      {/* Right — search, notifications, theme, avatar */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Search */}
        <div className={cn(
          'relative hidden md:flex items-center transition-all duration-300',
          searchFocused ? 'w-64' : 'w-48',
        )}>
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-8 pl-9 pr-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-150"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse-glow" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-80 glass-panel border border-slate-700/50 shadow-card-hover overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                    <span className="text-sm font-semibold text-slate-200">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Badge variant="danger" size="sm">{unreadCount} new</Badge>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/30">
                    {MOCK_NOTIFICATIONS.map((n) => (
                      <NotificationItem key={n.id} notification={n} />
                    ))}
                  </div>

                  <div className="px-4 py-2.5 border-t border-slate-700/50">
                    <NavLink
                      to="/dashboard/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      View all alerts →
                    </NavLink>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-150"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-700/50">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-300 leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">{user.role.displayName}</p>
            </div>
            <Avatar
              src={user.avatar}
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
              online
            />
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Notification item ────────────────────────────────────────

interface NotifProps {
  notification: {
    id: string;
    title: string;
    message: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
    time: string;
    read: boolean;
  };
}

function NotificationItem({ notification: n }: NotifProps) {
  const Icon =
    n.severity === 'CRITICAL' ? ShieldAlert :
    n.severity === 'HIGH'     ? AlertTriangle : Info;

  const iconColor =
    n.severity === 'CRITICAL' ? 'text-purple-400' :
    n.severity === 'HIGH'     ? 'text-red-400' :
    n.severity === 'MEDIUM'   ? 'text-amber-400' : 'text-blue-400';

  return (
    <div className={cn(
      'flex gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors cursor-pointer',
      !n.read && 'bg-brand-500/5',
    )}>
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', n.read ? 'text-slate-400' : 'text-slate-200')}>
          {n.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-2xs text-slate-600 mt-1">{timeAgo(n.time)}</p>
      </div>
      {!n.read && (
        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
      )}
    </div>
  );
}
