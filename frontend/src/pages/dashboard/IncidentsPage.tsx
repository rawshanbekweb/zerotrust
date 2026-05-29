import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, Clipboard, ShieldAlert as ShieldIcon, Terminal, Send, Calendar } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useSocket } from '../../shared/hooks/useSocket.js';
import { Badge } from '../../shared/ui/badge.js';
import { useUIStore } from '../../store/ui.store.js';
import { timeAgo } from '../../shared/utils/format.js';

interface IncidentItem {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  affectedUserId?: string | null;
  affectedDeviceId?: string | null;
  assignedToId?: string | null;
  detectedAt: string;
  isSimulated: boolean;
  sourceIp?: string | null;
  attackVector?: string | null;
  mitreTactic?: string | null;
  mitreTechnique?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

interface IncidentDetail extends IncidentItem {
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  updates: Array<{
    id: string;
    authorId?: string | null;
    message: string;
    type: 'COMMENT' | 'STATUS_CHANGE' | 'ESCALATION' | 'RESOLUTION';
    createdAt: string;
    author?: {
      firstName: string;
      lastName: string;
      avatar?: string | null;
    } | null;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  // Selected incident details
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [analysts, setAnalysts] = useState<any[]>([]);

  // Forms states
  const [commentText, setCommentText] = useState('');
  const [statusExplanation, setStatusExplanation] = useState('');
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100, sortBy: 'detectedAt', sortOrder: 'desc' };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterSeverity !== 'all') params.severity = filterSeverity;

      const data = await dashboardApi.getIncidents(params);
      if (data && data.incidents) {
        setIncidents(data.incidents);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch incidents.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysts = async () => {
    try {
      const data = await dashboardApi.getUsers({ limit: 100 });
      if (data && data.users) {
        // Find analysts and admins to assign
        setAnalysts(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch analysts list', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchAnalysts();
  }, [filterStatus, filterSeverity]);

  const loadIncidentDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const incident = await dashboardApi.getIncidentById(id);
      setDetail(incident);
    } catch (err) {
      console.error('Failed to fetch detail', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load timeline.' });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      loadIncidentDetail(selectedIncidentId);
    } else {
      setDetail(null);
    }
  }, [selectedIncidentId]);

  // Subscribe to real-time incident broadcasts
  useSocket({
    'incident:new': (newInc: IncidentItem) => {
      setIncidents((prev) => [newInc, ...prev]);
      addToast({ type: 'error', title: '🚨 New Incident Detected', message: newInc.title });
    },
    'incident:update': (updatedInc: IncidentItem) => {
      setIncidents((prev) => prev.map((i) => i.id === updatedInc.id ? { ...i, ...updatedInc } : i));
      if (selectedIncidentId === updatedInc.id) {
        // Refetch details
        loadIncidentDetail(updatedInc.id);
      }
    },
    'incident:comment': (commentData: { incidentId: string; comment: any }) => {
      if (selectedIncidentId === commentData.incidentId && detail) {
        setDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            updates: [...prev.updates, commentData.comment]
          };
        });
      }
    }
  });

  const handleAssign = async (analystId: string | null) => {
    if (!selectedIncidentId) return;
    try {
      await dashboardApi.assignIncident(selectedIncidentId, analystId);
      addToast({ type: 'success', title: 'Assigned', message: 'Mas\'ul muvaffaqiyatli biriktirildi.' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', message: 'Assignment failed.' });
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!selectedIncidentId || !showStatusModal) return;
    try {
      await dashboardApi.updateIncidentStatus(selectedIncidentId, showStatusModal, statusExplanation || 'Manual adjustment');
      addToast({ type: 'success', title: 'Status Updated', message: `Incident is now ${showStatusModal}.` });
      setShowStatusModal(null);
      setStatusExplanation('');
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', message: 'Status change failed.' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !commentText.trim()) return;
    try {
      await dashboardApi.addIncidentComment(selectedIncidentId, commentText.trim());
      setCommentText('');
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to post remark.' });
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
            <ShieldAlert className="h-6 w-6 text-red-400 animate-pulse" />
            SOC Incident Response Console
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and contain cyberattacks, assign security operators, and log mitigating actions
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Grid Filter Bar ─────────────────────────────────── */}
      <div className="glass-card p-4 border border-slate-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterStatus(type)}
              className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border ${
                filterStatus === type
                  ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-sm'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              {type === 'all' ? 'All Statuses' : type}
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

      {/* ─── Main Content Two Column Drawer ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        
        {/* Incident List (2 columns) */}
        <div className="xl:col-span-2 space-y-3">
          {loading && incidents.length === 0 ? (
            <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-red-400 mb-3" />
              Scanning active threat registries...
            </div>
          ) : incidents.length === 0 ? (
            <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500 flex flex-col items-center justify-center">
              <ShieldIcon className="h-10 w-10 text-slate-750 mb-3" />
              <h3 className="text-slate-300 font-semibold">Zero Incidents</h3>
              <p className="text-xs text-slate-500 mt-1">Hooray! No pending threat investigations at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncidentId(incident.id)}
                  className={`glass-card p-4 border transition-all cursor-pointer flex items-start gap-4 hover:border-slate-600/50 hover:bg-slate-750/10 table-row-interactive ${
                    selectedIncidentId === incident.id
                      ? 'border-brand-500/50 bg-brand-500/5 shadow-brand-500/5'
                      : incident.status === 'RESOLVED' || incident.status === 'CLOSED'
                      ? 'border-slate-800/40 opacity-70 bg-slate-900/10'
                      : 'border-slate-700/40 bg-slate-900/40 hover:shadow-card-hover'
                  }`}
                >
                  {/* Left Indicators */}
                  <div className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${getSeverityColor(incident.severity)}`}>
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{incident.title}</h3>
                      {incident.isSimulated && (
                        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-5xs px-1.5 py-0.5 rounded font-mono uppercase tracking-widest font-bold">SIMULATION</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate leading-relaxed">{incident.description}</p>
                    
                    <div className="flex items-center gap-4 text-2xs text-slate-500 mt-2 font-mono">
                      <span>Operator: {incident.assignedTo ? `${incident.assignedTo.firstName} ${incident.assignedTo.lastName}` : 'Unassigned'}</span>
                      <span>Type: {incident.type}</span>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <Badge variant={incident.status.toLowerCase() as any} dot size="sm">
                      {incident.status}
                    </Badge>
                    <span className="text-4xs text-slate-550 font-mono">{timeAgo(incident.detectedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incident Detail Drawer/Panel (1 column) */}
        <div className="xl:col-span-1">
          <div className="glass-card border border-slate-700/40 h-full min-h-[460px] flex flex-col justify-between overflow-hidden relative">
            
            {/* Header placeholder or Title */}
            {!selectedIncidentId ? (
              <div className="flex flex-col items-center justify-center text-center p-12 text-slate-500 h-full">
                <Clipboard className="h-10 w-10 text-slate-750 mb-3" />
                <h3 className="text-slate-300 font-semibold text-sm">Threat Investigation Panel</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                  Select a security incident from the list to view timeline details, assign mas'ul, and log responses.
                </p>
              </div>
            ) : loadingDetail ? (
              <div className="flex flex-col items-center justify-center text-center p-12 text-slate-500 h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
                Retrieving incident timeline logs...
              </div>
            ) : detail ? (
              <div className="flex flex-col h-full justify-between select-text">
                
                {/* Scrollable details */}
                <div className="flex-1 p-5 overflow-y-auto space-y-5 max-h-[500px] xl:max-h-[580px]">
                  
                  {/* Title & Metadata */}
                  <div className="space-y-2 pb-4 border-b border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-4xs text-slate-500 font-mono uppercase tracking-widest">ID: {detail.id}</span>
                      <Badge variant={detail.severity.toLowerCase() as any}>{detail.severity}</Badge>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-100">{detail.title}</h2>
                    <div className="flex items-center gap-1.5 text-2xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-550" />
                      <span>{new Date(detail.detectedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5">
                    <span className="block text-4xs uppercase tracking-widest text-slate-550 font-bold">Investigation Summary</span>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{detail.description}</p>
                  </div>

                  {/* MITRE ATT&CK block */}
                  {(detail.mitreTactic || detail.mitreTechnique) && (
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-2xs space-y-1.5 font-mono">
                      <span className="block text-4xs uppercase text-slate-550 font-bold tracking-wider">MITRE ATT&CK Classification</span>
                      {detail.mitreTactic && (
                        <div>
                          <span className="text-slate-500">Tactic:</span> <span className="text-cyan-400 font-semibold">{detail.mitreTactic}</span>
                        </div>
                      )}
                      {detail.mitreTechnique && (
                        <div>
                          <span className="text-slate-500">Technique:</span> <span className="text-slate-350">{detail.mitreTechnique}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Operator Assignment */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/40">
                    <label className="block text-4xs uppercase tracking-widest text-slate-550 font-bold">Assign Operator (Mas'ul)</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={detail.assignedToId ?? ''}
                        onChange={(e) => handleAssign(e.target.value || null)}
                        className="flex-1 bg-slate-900 border border-slate-700/65 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="">Unassigned (Biriktirilmagan)</option>
                        {analysts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.firstName} {a.lastName} ({a.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Containment Actions */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/40">
                    <span className="block text-4xs uppercase tracking-widest text-slate-550 font-bold">Containment Status Control</span>
                    <div className="flex flex-wrap gap-2">
                      {['INVESTIGATING', 'CONTAINED', 'RESOLVED'].map((st) => (
                        <button
                          key={st}
                          disabled={detail.status === st}
                          onClick={() => setShowStatusModal(st)}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider transition-colors border ${
                            detail.status === st
                              ? 'bg-slate-800 border-slate-700 text-slate-350 opacity-60'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-750 text-slate-300 hover:text-slate-100 hover:border-slate-650'
                          }`}
                        >
                          {st.slice(0, 1) + st.toLowerCase().slice(1).replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment Timeline Checklist */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/40">
                    <span className="block text-4xs uppercase tracking-widest text-slate-550 font-bold flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      Containment Audit Trail
                    </span>
                    <div className="space-y-3 pl-2.5 border-l border-slate-800">
                      {detail.updates.map((update) => (
                        <div key={update.id} className="relative text-xs space-y-1">
                          {/* Bullet node dot */}
                          <span className={`absolute -left-[14.5px] top-1.5 h-2 w-2 rounded-full border ${
                            update.type === 'STATUS_CHANGE' ? 'bg-cyan-500 border-cyan-400' : 'bg-slate-800 border-slate-700'
                          }`} />
                          
                          <div className="flex items-center gap-2 text-3xs text-slate-500 font-mono">
                            <span className="font-semibold text-slate-400">
                              {update.author ? `${update.author.firstName} ${update.author.lastName}` : 'Detection Engine'}
                            </span>
                            <span>•</span>
                            <span>{timeAgo(update.createdAt)}</span>
                          </div>
                          
                          <p className={`text-2xs leading-relaxed font-sans ${
                            update.type === 'STATUS_CHANGE' ? 'text-slate-450 italic' : 'text-slate-300'
                          }`}>
                            {update.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Foot: Submit Comment Form */}
                <form onSubmit={handleAddComment} className="border-t border-slate-800/60 p-3 bg-slate-950/25 shrink-0 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Log analyst observation or incident update..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-350 focus:outline-none placeholder-slate-600 focus:border-cyan-500/70"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-550 text-white transition-colors disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>

              </div>
            ) : null}

          </div>
        </div>

      </div>

      {/* ─── Status Update Prompt Explanation Modal ─────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <ShieldIcon className="h-5 w-5 text-cyan-400" />
                Change Incident Status to {showStatusModal}?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Please enter a brief explanation or log notes regarding the containment strategy or remediation steps applied. This will be saved in the audit logs.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Remediation Action Log</label>
              <textarea
                placeholder="e.g., Compromised host isolated, traffic rerouted to sandbox environment, or user validated authorization."
                value={statusExplanation}
                onChange={(e) => setStatusExplanation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 h-20 resize-none placeholder-slate-650"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowStatusModal(null); setStatusExplanation(''); }}
                className="rounded-xl border border-slate-700 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-350 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleStatusChangeSubmit}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-550 text-white border border-cyan-500/25 px-4 py-2 text-xs font-semibold transition-colors"
              >
                Log Status Change
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
