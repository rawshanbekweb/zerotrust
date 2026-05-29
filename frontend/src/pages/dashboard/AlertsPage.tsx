import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, CheckSquare, ShieldAlert, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useSocket } from '../../shared/hooks/useSocket.js';
import { Badge } from '../../shared/ui/badge.js';
import { useUIStore } from '../../store/ui.store.js';
import { timeAgo } from '../../shared/utils/format.js';

interface AlertItem {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  isRead: boolean;
  sourceIp?: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('unread');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' };
      if (filterRead === 'read') params.isRead = 'true';
      if (filterRead === 'unread') params.isRead = 'false';
      if (filterSeverity !== 'all') params.severity = filterSeverity;

      const data = await dashboardApi.getAlerts(params);
      if (data && data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
      addToast({ type: 'error', title: 'Loading Error', message: 'Failed to fetch security alerts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterRead, filterSeverity]);

  // Subscribe to real-time alerts via WebSockets
  useSocket({
    'alert:new': (newAlert: AlertItem) => {
      // Play a subtle notification audio beep for high-priority alerts
      if (['HIGH', 'CRITICAL'].includes(newAlert.severity)) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
          audio.volume = 0.2;
          audio.play().catch(() => {});
        } catch {}
      }

      // Add to list if it fits the current filters
      if (filterRead === 'read') return; // Don't append to read list
      if (filterSeverity !== 'all' && newAlert.severity !== filterSeverity) return;

      setAlerts((prev) => [newAlert, ...prev]);

      addToast({
        type: newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH' ? 'error' : 'warning',
        title: `🚨 Live Alert: ${newAlert.title}`,
        message: newAlert.description
      });
    }
  });

  const handleMarkRead = async (id: string) => {
    try {
      await dashboardApi.markAlertAsRead(id);
      
      // If we are filtering by unread, remove it immediately with animation
      if (filterRead === 'unread') {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
      }
      addToast({ type: 'success', title: 'Alert Acknowledged', message: 'Alert has been cleared.' });
    } catch (err) {
      console.error('Failed to mark alert read', err);
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not update alert.' });
    }
  };

  const handleMarkAllRead = async () => {
    if (alerts.length === 0) return;
    try {
      await dashboardApi.markAllAlertsAsRead();
      setAlerts([]);
      addToast({ type: 'success', title: 'All Cleared', message: 'All active alerts marked as acknowledged.' });
    } catch (err) {
      console.error('Failed to clear alerts', err);
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not clear all alerts.' });
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return <ShieldAlert className="h-4.5 w-4.5 text-purple-400" />;
      case 'HIGH':     return <AlertTriangle className="h-4.5 w-4.5 text-red-400" />;
      case 'MEDIUM':   return <AlertCircle className="h-4.5 w-4.5 text-amber-400" />;
      default:         return <Info className="h-4.5 w-4.5 text-cyan-400" />;
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'HIGH':     return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'MEDIUM':   return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:         return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-400" />
            Security Alerts Panel
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time security feeds and automatic anomaly detection telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAlerts}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleMarkAllRead}
            disabled={alerts.length === 0}
            className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 border border-brand-500/30 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Acknowledge All
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ──────────────────────────────────────── */}
      <div className="glass-card p-4 border border-slate-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['unread', 'read', 'all'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterRead(type as any)}
              className={`flex-1 sm:flex-none rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border ${
                filterRead === type
                  ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-sm'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-500 whitespace-nowrap">Severity filter:</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full sm:w-36 bg-slate-900 border border-slate-700/65 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* ─── Alerts Grid ─────────────────────────────────────── */}
      <div className="space-y-4">
        {loading && alerts.length === 0 ? (
          <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-400 mb-3" />
            Scanning active alert logs...
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500 flex flex-col items-center justify-center">
            <BellOff className="h-10 w-10 text-slate-750 mb-3" />
            <h3 className="text-slate-300 font-semibold">All Clear</h3>
            <p className="text-xs text-slate-500 mt-1">No pending security alerts matched your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence initial={false}>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.25, type: 'tween' }}
                  className={`glass-card p-4 border transition-colors flex items-start gap-4 ${
                    alert.isRead 
                      ? 'border-slate-800/40 bg-slate-900/10 opacity-70' 
                      : 'border-slate-700/45 hover:border-slate-650/60 bg-slate-900/40 hover:shadow-card-hover'
                  }`}
                >
                  {/* Severity Indicator */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${getSeverityColor(alert.severity)}`}>
                    {getSeverityIcon(alert.severity)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{alert.title}</h3>
                      <Badge variant={alert.severity.toLowerCase() as any} dot size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
                    
                    <div className="flex items-center gap-4 text-2xs text-slate-500 mt-2 font-mono">
                      <span>Source IP: {alert.sourceIp ?? 'Local Interface'}</span>
                      <span>Type: {alert.type}</span>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className="text-2xs text-slate-500">{timeAgo(alert.createdAt)}</span>
                    {!alert.isRead && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Acknowledge Alert"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
