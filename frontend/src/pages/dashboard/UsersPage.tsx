import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, RefreshCw, Eye, ShieldAlert, ShieldCheck, UserX, Terminal, X } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { Badge } from '../../shared/ui/badge.js';
import { useUIStore } from '../../store/ui.store.js';

interface UserItem {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  isActive: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trustScore: number;
  role: {
    id: string;
    name: string;
    displayName: string;
    color: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Inspector modal states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sortBy: 'username', sortOrder: 'asc' };
      if (search) params.search = search;

      const data = await dashboardApi.getUsers(params);
      if (data && data.users) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load users', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch user directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const loadRiskProfile = async (id: string) => {
    setLoadingProfile(true);
    try {
      const data = await dashboardApi.getUserRiskProfile(id);
      if (data) {
        setRiskProfile(data.profile);
        setRiskHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to load risk profile', err);
      addToast({ type: 'error', title: 'Error', message: 'Could not load user risk factors.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadRiskProfile(selectedUserId);
    } else {
      setRiskProfile(null);
      setRiskHistory([]);
    }
  }, [selectedUserId]);

  const handleDeactivate = async (id: string) => {
    const confirm = window.confirm('Quarantine request: Deactivate this user account and revoke all their active sessions immediately?');
    if (!confirm) return;
    try {
      await dashboardApi.deactivateUser(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: false } : u))
      );
      addToast({ type: 'success', title: 'Account Deactivated', message: 'User account disabled successfully.' });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message ?? err.message ?? 'Deactivation failed';
      addToast({ type: 'error', title: 'Action Denied', message: errMsg });
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'HIGH':     return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'MEDIUM':   return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:         return 'bg-green-500/10 border-green-500/30 text-green-400';
    }
  };

  const getParsedFactors = (factorsString?: string) => {
    if (!factorsString) return [];
    try {
      return JSON.parse(factorsString);
    } catch {
      return [];
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-400" />
            Identities & Access Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage authenticated users, evaluate active risk profiles, and enforce dynamic deactivation quarantines
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Filter & Search Bar ──────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
        <input
          type="text"
          placeholder="Search directory by name, username, email, department..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-slate-900 border border-slate-700/65 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-cyan-500/80"
        />
      </div>

      {/* ─── Users Table Grid ────────────────────────────────── */}
      {loading && users.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-400 mb-3" />
          Synchronizing active identity directories...
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <Users className="h-8 w-8 mx-auto text-slate-750 mb-3" />
          <h3 className="text-slate-300 font-semibold">No Accounts Found</h3>
          <p className="text-xs text-slate-500 mt-1">No user account matched your query.</p>
        </div>
      ) : (
        <div className="space-y-4 select-text">
          <div className="glass-card border border-slate-700/40 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider bg-slate-900/10">
                  <th className="py-3.5 px-4">User Account</th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4">Risk Rating</th>
                  <th className="py-3.5 px-4 text-center">Active Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-800/25 transition-colors">
                    {/* User profile details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-350 border border-slate-700/60 uppercase">
                          {userItem.firstName[0]}{userItem.lastName[0]}
                        </div>
                        <div>
                          <span className="block font-semibold text-slate-200">{userItem.firstName} {userItem.lastName}</span>
                          <span className="block text-3xs text-slate-500 font-mono">{userItem.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role & Dept */}
                    <td className="py-3.5 px-4">
                      <span className="block text-slate-300">{userItem.jobTitle ?? 'Staff'}</span>
                      <span className="block text-3xs text-slate-500 mt-0.5">{userItem.department ?? 'Engineering'} • {userItem.role.displayName}</span>
                    </td>

                    {/* Risk Level & Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 border text-4xs font-bold font-mono tracking-wide rounded ${getRiskLevelColor(userItem.riskLevel)}`}>
                          {userItem.riskLevel} ({userItem.riskScore})
                        </span>
                        <span className="text-3xs text-slate-500 font-mono">Trust: {userItem.trustScore}%</span>
                      </div>
                    </td>

                    {/* Active Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        {userItem.isActive ? (
                          <Badge variant="success" size="sm" dot>ACTIVE</Badge>
                        ) : (
                          <Badge variant="critical" size="sm" dot>SUSPENDED</Badge>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => setSelectedUserId(userItem.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Inspect Risk Profile factors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {userItem.isActive && (
                          <button
                            onClick={() => handleDeactivate(userItem.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                            title="Deactivate Account"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-2xs text-slate-500 font-mono">Showing {users.length} of {total} accounts</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg bg-slate-900 border border-slate-755 hover:bg-slate-800 px-3 py-1.5 text-2xs font-semibold text-slate-350 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="text-2xs font-mono text-slate-400 px-2">Page {page}</span>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg bg-slate-900 border border-slate-755 hover:bg-slate-800 px-3 py-1.5 text-2xs font-semibold text-slate-350 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── User Risk Profile Inspector Modal ───────────────── */}
      <AnimatePresence>
        {selectedUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[85vh] overflow-hidden"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 shrink-0">
                <h3 className="text-sm font-semibold text-slate-205 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  Identity Risk Vector Profile
                </h3>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="h-8 w-8 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-450 hover:text-slate-250 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingProfile ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500">
                  <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
                  Re-evaluating user risk database...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  
                  {/* Summary Card */}
                  {riskProfile && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/25 border border-slate-800/60 rounded-xl">
                      <div>
                        <span className="block text-4xs uppercase tracking-wider text-slate-500 font-semibold">Risk Rating Score</span>
                        <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
                          {riskProfile.currentScore}/100
                        </span>
                      </div>
                      <div>
                        <span className="block text-4xs uppercase tracking-wider text-slate-500 font-semibold">Posture Status Level</span>
                        <div className="mt-1.5 flex">
                          <Badge variant={riskProfile.level.toLowerCase() as any} dot>
                            {riskProfile.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Risk Factors */}
                  <div className="space-y-2">
                    <span className="block text-4xs uppercase tracking-widest text-slate-550 font-bold">Active Risk Factors</span>
                    {riskProfile && getParsedFactors(riskProfile.factors).length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {getParsedFactors(riskProfile.factors).map((factor: any, index: number) => (
                          <div key={index} className="p-3 bg-red-950/5 border border-red-500/20 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-slate-200 block">{factor.name}</strong>
                              <span className="text-3xs text-slate-500 font-mono">Weight factor: {factor.weight ?? 1.0}</span>
                            </div>
                            <span className="font-mono font-bold text-red-400">+{factor.score} pts</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-green-950/5 border border-green-500/20 rounded-xl flex items-center gap-2.5 text-xs text-green-400 leading-relaxed font-sans">
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        No active anomalies or warning flags registered on this identity.
                      </div>
                    )}
                  </div>

                  {/* Risk Score History Timeline */}
                  <div className="space-y-3">
                    <span className="block text-4xs uppercase tracking-widest text-slate-550 font-bold flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      Risk Rating Timeline Logs
                    </span>
                    {riskHistory.length > 0 ? (
                      <div className="space-y-3 pl-2.5 border-l border-slate-800/80 font-mono text-3xs select-text">
                        {riskHistory.map((history) => (
                          <div key={history.id} className="relative space-y-1">
                            {/* bullet */}
                            <span className={`absolute -left-[14.5px] top-1 h-2 w-2 rounded-full border ${
                              history.delta > 0 ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-green-550 border-green-500'
                            }`} />
                            
                            <div className="flex items-center gap-2 text-slate-500">
                              <span className="font-semibold text-slate-350">{new Date(history.createdAt).toLocaleString()}</span>
                              <span>•</span>
                              <span className={history.delta > 0 ? 'text-red-400' : 'text-green-400'}>
                                {history.delta > 0 ? `+${history.delta}` : history.delta} points
                              </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed font-sans">
                              {history.reason} (Score: {history.score}/100 - {history.level})
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-550 italic pl-1">No historical transitions recorded.</div>
                    )}
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
