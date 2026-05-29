import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, RefreshCw, Search, Eye, ShieldCheck, MapPin, X, Activity } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { Badge } from '../../shared/ui/badge.js';
import { useUIStore } from '../../store/ui.store.js';

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  description: string;
  ipAddress: string;
  userAgent?: string | null;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  createdAt: string;
  user?: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Inspector state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      if (search) params.search = search;
      if (filterSeverity !== 'all') params.severity = filterSeverity;

      const data = await dashboardApi.getAuditLogs(params);
      if (data && data.logs) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
      addToast({ type: 'error', title: 'Error', message: 'Could not load compliance log ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, filterSeverity]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return <Badge variant="critical" size="sm">{sev}</Badge>;
      case 'ERROR':    return <Badge variant="high" size="sm">{sev}</Badge>;
      case 'WARNING':  return <Badge variant="warning" size="sm">{sev}</Badge>;
      default:         return <Badge variant="info" size="sm">{sev}</Badge>;
    }
  };

  const getJSONPrettified = (jsonStr?: string | null) => {
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Clipboard className="h-6 w-6 text-slate-450" />
            Compliance Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable log trail capturing system configurations, access gates, and administrative modifications
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Filter & Search Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
          <input
            type="text"
            placeholder="Search audit trail by description, IP address, administrator name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700/65 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-cyan-500/80"
          />
        </div>

        {/* Severity */}
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-700/65 rounded-xl px-3.5 py-2 text-xs text-slate-350 focus:outline-none cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>

      </div>

      {/* ─── Logs List Layout ────────────────────────────────── */}
      {loading && logs.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-3" />
          Analyzing compliance ledgers...
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <Activity className="h-8 w-8 mx-auto text-slate-750 mb-3" />
          <h3 className="text-slate-300 font-semibold">No Log Entries</h3>
          <p className="text-xs text-slate-500 mt-1">No compliance log matched your query parameters.</p>
        </div>
      ) : (
        <div className="space-y-4 select-text">
          
          {/* Timeline Stack */}
          <div className="glass-card border border-slate-700/40 divide-y divide-slate-800/60 overflow-hidden">
            {logs.map((logItem) => (
              <div
                key={logItem.id}
                onClick={() => setSelectedLog(logItem)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-750/10 cursor-pointer transition-colors"
              >
                {/* Identity, Action & Details */}
                <div className="flex-1 min-w-0 flex items-start gap-4">
                  <div className="mt-1 shrink-0">
                    {getSeverityBadge(logItem.severity)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 font-mono">{logItem.action}</span>
                      <span className="text-slate-650">•</span>
                      <span className="text-3xs text-slate-500 uppercase tracking-wider">{logItem.resource}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{logItem.description}</p>
                    
                    <div className="flex items-center gap-3.5 text-2xs text-slate-550 font-mono">
                      <span>Operator: {logItem.user ? `${logItem.user.firstName} ${logItem.user.lastName}` : 'System Agent'}</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-slate-650" />
                        {logItem.ipAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inspect Button & Date */}
                <div className="flex items-center gap-4 shrink-0 justify-end">
                  <span className="text-2xs text-slate-500 font-mono">{new Date(logItem.createdAt).toLocaleString()}</span>
                  {(logItem.oldValue || logItem.newValue) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedLog(logItem); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-slate-200 border border-slate-750 transition-colors"
                      title="Inspect JSON Differences"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-2xs text-slate-500 font-mono">Showing {logs.length} of {total} events</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg bg-slate-900 border border-slate-750 hover:bg-slate-800 px-3 py-1.5 text-2xs font-semibold text-slate-350 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="text-2xs font-mono text-slate-400 px-2">Page {page}</span>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg bg-slate-900 border border-slate-750 hover:bg-slate-800 px-3 py-1.5 text-2xs font-semibold text-slate-350 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── JSON Diff Inspector Modal ──────────────────────── */}
      <AnimatePresence>
        {selectedLog && (selectedLog.oldValue || selectedLog.newValue) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-slate-905 border border-slate-750/70 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh] overflow-hidden"
            >
              
              {/* Drawer Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-205 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-cyan-400" />
                    Resource JSON Diff Inspector
                  </h3>
                  <p className="text-3xs text-slate-500 font-mono mt-0.5 uppercase">
                    Action: {selectedLog.action} • Resource ID: {selectedLog.resourceId ?? 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="h-8 w-8 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-450 hover:text-slate-250 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Description Summary */}
              <div className="p-3 bg-slate-900/35 rounded-xl border border-slate-800/50 text-xs text-slate-400 leading-relaxed shrink-0">
                {selectedLog.description}
              </div>

              {/* Side-by-Side Code Viewer */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto min-h-[220px]">
                
                {/* Old State */}
                <div className="flex flex-col h-full overflow-hidden border border-slate-800/60 rounded-xl">
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/60 text-4xs font-bold font-mono tracking-widest text-slate-550 uppercase">
                    OLD STATE (PRE-UPDATE)
                  </div>
                  <div className="flex-1 bg-black/30 p-4 font-mono text-3xs text-red-300 overflow-y-auto leading-relaxed select-text">
                    {selectedLog.oldValue ? (
                      <pre className="whitespace-pre-wrap">{getJSONPrettified(selectedLog.oldValue)}</pre>
                    ) : (
                      <span className="text-slate-650 italic">None (Resource created)</span>
                    )}
                  </div>
                </div>

                {/* New State */}
                <div className="flex flex-col h-full overflow-hidden border border-slate-800/60 rounded-xl">
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/60 text-4xs font-bold font-mono tracking-widest text-green-500/80 uppercase">
                    NEW STATE (POST-UPDATE)
                  </div>
                  <div className="flex-1 bg-black/30 p-4 font-mono text-3xs text-green-300 overflow-y-auto leading-relaxed select-text">
                    {selectedLog.newValue ? (
                      <pre className="whitespace-pre-wrap">{getJSONPrettified(selectedLog.newValue)}</pre>
                    ) : (
                      <span className="text-slate-650 italic">None (Resource deleted)</span>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
