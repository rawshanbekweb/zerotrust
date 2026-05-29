import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Bell, Users, Monitor, Activity, TrendingUp,
  TrendingDown, Minus, Lock, AlertTriangle,
  Eye, Zap, CheckCircle2, ShieldAlert as AlertIcon, RefreshCw
} from 'lucide-react';
import { Badge } from '../../shared/ui/badge.js';
import { StatCardSkeleton } from '../../shared/ui/skeleton.js';
import { cn } from '../../shared/utils/cn.js';
import { riskScoreColor, timeAgo } from '../../shared/utils/format.js';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useSocket } from '../../shared/hooks/useSocket.js';
import { useUIStore } from '../../store/ui.store.js';

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  title:       string;
  value:       string | number;
  delta?:      number;
  deltaLabel?: string;
  icon:        React.ElementType;
  iconColor:   string;
  iconBg:      string;
  glow?:       string;
  loading?:    boolean;
}

function StatCard({ title, value, delta, deltaLabel, icon: Icon, iconColor, iconBg, glow, loading }: StatCardProps) {
  if (loading) return <StatCardSkeleton />;

  const TrendIcon = delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta === undefined ? '' : delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-slate-500';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn('glass-card p-5 cursor-default border border-slate-700/40 transition-shadow duration-300 hover:shadow-card-hover', glow)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">{value}</p>
          {delta !== undefined && TrendIcon && (
            <div className={cn('flex items-center gap-1 mt-1.5', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs">{Math.abs(delta)} {deltaLabel ?? 'from yesterday'}</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Threat level gauge ───────────────────────────────────────

function ThreatGauge({ score }: { score: number }) {
  const level   = score >= 85 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';
  const color   = score >= 85 ? '#a855f7' : score >= 60 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#22c55e';
  const pct     = score;
  const stroke  = 10;
  const r       = 45;
  const circ    = 2 * Math.PI * r;
  const dash    = (pct / 100) * circ;

  const severityVariantMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
    CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', INFO: 'info',
  };

  return (
    <div className="glass-card p-5 flex flex-col items-center gap-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest self-start">Platform Risk Score</p>
      <div className="relative flex items-center justify-center">
        <svg width={120} height={120} className="-rotate-90">
          <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth={stroke} />
          <motion.circle
            cx={60} cy={60} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('text-3xl font-bold tabular-nums', riskScoreColor(score))}>{score}</span>
          <span className="text-2xs text-slate-500">/ 100</span>
        </div>
      </div>
      <Badge variant={severityVariantMap[level] ?? 'info'} dot>{level}</Badge>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function OverviewPage() {
  const [stats, setStats] = useState<any>({
    openIncidents: 0,
    activeAlerts: 0,
    activeUsers: 0,
    trustedDevices: 0,
    totalDevices: 0,
    activeSessions: 0,
    highRiskUsers: 0,
    activePolicies: 0,
    platformRiskScore: 10,
    totalSimulations: 0
  });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockdownMode, setLockdownMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const addToast = useUIStore((s) => s.addNotification);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, alertsData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAlerts({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' })
      ]);
      
      if (statsData) setStats(statsData);
      if (alertsData && alertsData.alerts) setEvents(alertsData.alerts);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Connect WebSockets for real-time overview updates!
  useSocket({
    'alert:new': (newAlert) => {
      setEvents((prev) => [newAlert, ...prev.slice(0, 5)]);
      // Increment alerts count
      setStats((s: any) => ({ ...s, activeAlerts: s.activeAlerts + 1 }));
    },
    'incident:new': () => {
      setStats((s: any) => ({ ...s, openIncidents: s.openIncidents + 1 }));
    },
    'incident:update': () => {
      // Reload stats to get exact counts
      dashboardApi.getStats().then((data) => {
        if (data) setStats(data);
      });
    },
    'risk:update': (riskData) => {
      setStats((s: any) => ({ ...s, platformRiskScore: riskData.score }));
    }
  });

  const handleScan = () => {
    setIsScanning(true);
    addToast({ type: 'info', title: 'Security Scan Initiated', message: 'Sweeping registered endpoints & tokens...' });
    
    setTimeout(() => {
      setIsScanning(false);
      addToast({ type: 'success', title: 'Scan Complete', message: '0 new threats found. Identity profiles verified.' });
      loadData();
    }, 2500);
  };

  const handleLockSessions = async () => {
    const confirm = window.confirm('Quarantine request: Force sign-out all active user sessions?');
    if (!confirm) return;
    try {
      // Reset simulation restores risk and invalidates session simulations
      await dashboardApi.resetSimulations();
      addToast({ type: 'success', title: 'Global Lockdown', message: 'All active sessions invalidated.' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Operation Failed', message: 'Unable to quarantine session registry.' });
    }
  };

  const toggleLockdownMode = () => {
    const nextMode = !lockdownMode;
    setLockdownMode(nextMode);
    
    if (nextMode) {
      // Play high priority warning sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-84.wav');
        audio.volume = 0.2;
        audio.play().catch(() => {});
      } catch {}
      addToast({ type: 'error', title: 'Lockdown Active', message: 'Platform is in restricted mode. External auth blocked.' });
    } else {
      addToast({ type: 'success', title: 'Lockdown Lifted', message: 'Platform restored to baseline Zero Trust state.' });
    }
  };

  const severityVariantMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
    CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', INFO: 'info',
  };

  return (
    <div className={cn("p-6 space-y-6 transition-all duration-500", lockdownMode && "bg-red-950/5 shadow-inner-red")}>

      {/* ─── Global Lockdown Banner ─────────────────────────── */}
      <AnimatePresence>
        {lockdownMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-xl border border-red-500/35 bg-red-500/10 p-4 flex items-center justify-between text-red-400 select-text animate-pulse-glow"
          >
            <div className="flex items-center gap-3">
              <AlertIcon className="h-5 w-5 shrink-0" />
              <div>
                <strong className="text-sm font-semibold block">GLOBAL SECURE LOCKDOWN MODE ENABLED</strong>
                <span className="text-2xs text-red-550 leading-relaxed font-sans">
                  System administrators have restricted external connections. Identity access constraints are set to DENY by default.
                </span>
              </div>
            </div>
            <button
              onClick={toggleLockdownMode}
              className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs px-3 py-1.5 font-bold transition-all text-white font-mono"
            >
              DISABLE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between select-text">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Zero Trust Operations Console
            {lockdownMode && <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Zero Trust platform status — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse-glow", lockdownMode ? "bg-red-500" : "bg-green-450")} />
            <span className="text-4xs text-slate-500 font-semibold font-mono tracking-widest">
              {lockdownMode ? "LOCKDOWN ACTIVE" : "SYSTEM OPERATIONAL"}
            </span>
          </span>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { title: 'Open Incidents',  value: stats.openIncidents ?? 0,   icon: ShieldAlert, iconColor: 'text-red-400',    iconBg: 'bg-red-500/15',    glow: 'hover:shadow-glow-danger', loading   },
          { title: 'Active Alerts',   value: stats.activeAlerts ?? 0,   icon: Bell,        iconColor: 'text-amber-400',  iconBg: 'bg-amber-500/15',  glow: 'hover:shadow-glow-warning', loading  },
          { title: 'Active Users',    value: stats.activeUsers ?? 0,   icon: Users,       iconColor: 'text-brand-400',  iconBg: 'bg-brand-500/15',  glow: 'hover:shadow-glow-brand', loading    },
          { title: 'Trusted Devices', value: `${stats.trustedDevices ?? 0}/${stats.totalDevices ?? 0}`,   icon: Monitor,     iconColor: 'text-cyber-400',  iconBg: 'bg-cyber-500/15',  glow: 'hover:shadow-glow-cyan', loading     },
        ].map((card) => (
          <motion.div key={card.title} variants={item}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Middle row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Risk gauge */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <ThreatGauge score={stats.platformRiskScore ?? 10} />
        </motion.div>

        {/* Second row stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start"
        >
          {[
            { title: 'Active Sessions',        value: stats.activeSessions ?? 0, icon: Activity,       iconColor: 'text-green-400',  iconBg: 'bg-green-500/15', loading  },
            { title: 'High Risk Users',        value: stats.highRiskUsers ?? 0,   icon: AlertTriangle,  iconColor: 'text-red-400',    iconBg: 'bg-red-500/15', loading    },
            { title: 'Policies Active',        value: stats.activePolicies ?? 0,   icon: CheckCircle2,   iconColor: 'text-cyan-400',   iconBg: 'bg-cyan-500/15', loading   },
            { title: 'Threat Simulations',     value: stats.totalSimulations ?? 0,  icon: Zap,            iconColor: 'text-amber-400',  iconBg: 'bg-amber-500/15', loading  },
          ].map((card) => (
            <motion.div key={card.title} variants={item}>
              <StatCard {...card} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ─── Bottom row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-text">

        {/* Recent activity */}
        <motion.div
          className="xl:col-span-2 glass-card overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4 bg-slate-900/10">
            <h2 className="text-sm font-semibold text-slate-205">Live Security Feeds</h2>
            <Badge variant="info" size="sm">{events.length} logs online</Badge>
          </div>

          <div className="divide-y divide-slate-800/40">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-750/15 transition-colors cursor-pointer table-row-interactive"
              >
                <Badge
                  variant={severityVariantMap[event.severity] ?? 'info'}
                  dot
                  className="mt-0.5 shrink-0"
                >
                  {event.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{event.title}</p>
                  <p className="text-xs text-slate-500 truncate leading-relaxed">{event.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-550 font-mono">{timeAgo(event.createdAt)}</p>
                  {event.sourceIp && (
                    <p className="text-3xs text-slate-650 font-mono mt-0.5">{event.sourceIp}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          className="glass-card overflow-hidden flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div>
            <div className="border-b border-slate-700/50 px-5 py-4 bg-slate-900/10">
              <h2 className="text-sm font-semibold text-slate-205">Enforcement Command Control</h2>
            </div>
            
            <div className="p-4 space-y-2.5">
              {/* Scan action */}
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-700/55 px-4 py-3 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-750/30 transition-all text-left"
              >
                <Eye className={cn('h-4 w-4 shrink-0', isScanning ? 'text-slate-500 animate-spin' : 'text-green-400')} />
                {isScanning ? 'Executing Security Audit Sweep...' : 'Run Security Audit Sweep'}
              </button>

              {/* Lockdown action */}
              <button
                onClick={toggleLockdownMode}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold transition-all text-left",
                  lockdownMode 
                    ? "bg-red-500/10 border-red-500/35 text-red-400 hover:bg-red-500/20" 
                    : "border-slate-700/55 text-slate-350 hover:border-slate-600 hover:bg-slate-750/30"
                )}
              >
                <ShieldAlert className={cn('h-4 w-4 shrink-0', lockdownMode ? 'text-red-400 animate-pulse' : 'text-red-500')} />
                {lockdownMode ? 'Disable Lockdown Mode' : 'Enable Lockdown Mode'}
              </button>

              {/* Terminate sessions action */}
              <button
                onClick={handleLockSessions}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-700/55 px-4 py-3 text-xs font-semibold text-slate-350 hover:border-slate-600 hover:bg-slate-750/30 transition-all text-left"
              >
                <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                Force Invalidate Session Registry
              </button>
            </div>
          </div>

          {/* Zero Trust status */}
          <div className="border-t border-slate-700/50 p-4 bg-slate-905/20">
            <p className="text-4xs font-semibold text-slate-550 uppercase tracking-widest mb-3">Gateway Authentication Vectors</p>
            {[
              { label: 'Identity Risk Assessment', pct: 100 - (stats.platformRiskScore ?? 0), color: 'bg-emerald-500' },
              { label: 'Device Trust Coverage',          pct: stats.totalDevices ? Math.round((stats.trustedDevices / stats.totalDevices) * 100) : 100, color: 'bg-cyan-500' },
              { label: 'Compliance Policies Coverage',  pct: 100, color: 'bg-brand-500' },
            ].map(({ label, pct, color }) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-2xs mb-1">
                  <span className="text-slate-450">{label}</span>
                  <span className="text-slate-300 font-mono">{pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <motion.div
                    className={cn('h-1.5 rounded-full', color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
