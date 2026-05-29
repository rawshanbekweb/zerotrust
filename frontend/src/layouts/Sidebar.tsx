import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShieldAlert, Bell, Monitor, Users, ScrollText,
  Shield, BarChart3, Zap, Settings, ChevronLeft, ChevronRight,
  Activity, LogOut,
} from 'lucide-react';
import { cn } from '../shared/utils/cn.js';
import { useUIStore } from '../store/ui.store.js';
import { useAuthStore } from '../store/auth.store.js';
import { Avatar } from '../shared/ui/avatar.js';
import { authApi } from '../shared/api/auth.api.js';

// ─── Navigation structure ─────────────────────────────────────

interface NavItem {
  label:   string;
  path:    string;
  icon:    React.ElementType;
  badge?:  number;
  danger?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Overview',      path: '/dashboard',            icon: LayoutDashboard },
      { label: 'Live Events',   path: '/dashboard/analytics',  icon: Activity },
    ],
  },
  {
    title: 'THREATS',
    items: [
      { label: 'Incidents',     path: '/dashboard/incidents',  icon: ShieldAlert },
      { label: 'Alerts',        path: '/dashboard/alerts',     icon: Bell },
      { label: 'Simulation',    path: '/dashboard/simulation', icon: Zap },
    ],
  },
  {
    title: 'IDENTITY',
    items: [
      { label: 'Users & Roles', path: '/dashboard/users',      icon: Users },
      { label: 'Devices',       path: '/dashboard/devices',    icon: Monitor },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { label: 'Analytics',     path: '/dashboard/analytics',  icon: BarChart3 },
      { label: 'Audit Logs',    path: '/dashboard/audit',      icon: ScrollText },
    ],
  },
  {
    title: 'CONTROL',
    items: [
      { label: 'Policies',      path: '/dashboard/policies',   icon: Shield },
      { label: 'Settings',      path: '/dashboard/settings',   icon: Settings },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();

  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    window.location.href = '/auth/login';
  }

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      initial={false}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex h-screen flex-col border-r border-slate-700/50 bg-surface-elevated/90 backdrop-blur-xl shrink-0 z-30"
    >
      {/* ── Logo ────────────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
        <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-brand">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-bold tracking-widest text-gradient-brand">
                  ZEROTRUST
                </span>
                <p className="text-2xs text-slate-500 tracking-wider">SECURITY PLATFORM</p>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 no-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-2">
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1 px-4 text-2xs font-semibold tracking-widest text-slate-600 uppercase"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>

            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => (
                <NavItemRow
                  key={item.path}
                  item={item}
                  collapsed={sidebarCollapsed}
                  isActive={
                    item.path === '/dashboard'
                      ? location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.path)
                  }
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User profile ────────────────────────────────────── */}
      <div className="border-t border-slate-700/50 p-3">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-700/30 cursor-pointer',
              sidebarCollapsed && 'justify-center',
            )}
          >
            <Avatar
              src={user.avatar}
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
              online
            />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-2xs text-slate-500 truncate">{user.role.displayName}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => void handleLogout()}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ─────────────────────────────────── */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-surface-elevated text-slate-400 hover:text-slate-200 hover:border-brand-500/50 transition-all duration-200 shadow-md z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}

// ─── Single nav item row ──────────────────────────────────────

interface NavItemRowProps {
  item:      NavItem;
  collapsed: boolean;
  isActive:  boolean;
}

function NavItemRow({ item, collapsed, isActive }: NavItemRowProps) {
  const Icon = item.icon;

  return (
    <li>
      <NavLink
        to={item.path}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex h-9 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20 shadow-inner'
            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent',
          collapsed && 'justify-center px-0',
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-brand-400"
          />
        )}

        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate overflow-hidden whitespace-nowrap flex-1"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge count */}
        {item.badge !== undefined && item.badge > 0 && !collapsed && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-2xs font-bold text-white">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
        {item.badge !== undefined && item.badge > 0 && collapsed && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </NavLink>
    </li>
  );
}
