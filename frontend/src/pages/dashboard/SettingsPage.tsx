import { useState, useEffect } from 'react';
import { Settings, Lock, Key, ShieldCheck, Laptop, AlertTriangle, RefreshCw } from 'lucide-react';
import { authApi } from '../../shared/api/auth.api.js';
import { useUIStore } from '../../store/ui.store.js';
import { Badge } from '../../shared/ui/badge.js';

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  city?: string | null;
  country?: string | null;
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
  device?: {
    name: string;
    os?: string | null;
    browser?: string | null;
  } | null;
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = (await authApi.getSessions()) as SessionItem[];
      if (data) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast({ type: 'warning', title: 'Input Error', message: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Mismatch', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      addToast({ type: 'warning', title: 'Weak Password', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setIsUpdating(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      addToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchSessions();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message ?? err.message ?? 'Password change failed';
      addToast({ type: 'error', title: 'Update Failed', message: errMsg });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTerminateAll = async () => {
    const confirm = window.confirm('Are you sure you want to terminate all other active sessions? You will remain signed in.');
    if (!confirm) return;
    try {
      await authApi.logoutAll();
      addToast({ type: 'success', title: 'Sessions Revoked', message: 'All other active sessions have been terminated.' });
      fetchSessions();
    } catch (err) {
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not terminate other sessions.' });
    }
  };


  return (
    <div className="p-6 space-y-6 select-text">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-450" />
          Operator Account Control
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure security settings, enroll MFA protocols, and monitor active session registries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Profile settings (password and MFA) */}
        <div className="space-y-6 flex flex-col">
          
          {/* Change Password Card */}
          <div className="glass-card p-5 border border-slate-700/40 flex-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              Update Account Password
            </h2>
            
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-550 mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-205 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-550 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-205 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-550 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-205 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-550 border border-cyan-550/25 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50 animate-pulse-glow"
                >
                  <Key className="h-4 w-4" />
                  {isUpdating ? 'Updating Credentials...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>

          {/* MFA Enrollment */}
          <div className="glass-card p-5 border border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Two-Factor Authentication (MFA)
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
              Add an extra layer of access compliance by forcing a mobile MFA code challenge upon credential submission.
            </p>
            <div className="flex items-center justify-between p-3.5 bg-slate-950/20 border border-slate-800/60 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-slate-350 block">Authenticator App</span>
                <span className="text-3xs text-slate-500">Google Authenticator or Microsoft Authenticator</span>
              </div>
              <button
                onClick={() => { setMfaEnabled(!mfaEnabled); addToast({ type: 'success', title: 'MFA Status', message: !mfaEnabled ? 'MFA enrollment simulation active.' : 'MFA disabled.' }); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  mfaEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-350'
                }`}
              >
                {mfaEnabled ? 'Enrolled (Simulated)' : 'Setup MFA'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sessions Monitoring */}
        <div className="glass-card p-5 border border-slate-700/40 flex flex-col justify-between h-full min-h-[360px]">
          <div>
            <div className="pb-3 border-b border-slate-800/60 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Laptop className="h-4 w-4 text-purple-400" />
                Active Authenticated Sessions
              </h2>
              <button
                onClick={handleTerminateAll}
                disabled={sessions.length <= 1}
                className="text-2xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-semibold disabled:opacity-40"
              >
                Revoke Others
              </button>
            </div>

            {loadingSessions ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
                Loading active session registry...
              </div>
            ) : (
              <div className="divide-y divide-slate-800/45 overflow-y-auto max-h-[420px] pt-1">
                {sessions.map((sess) => (
                  <div key={sess.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-slate-850 border border-slate-800 rounded-lg text-slate-400 mt-0.5">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-300">
                          {sess.device?.name ?? `${sess.device?.os ?? 'Staff Desktop'} (${sess.device?.browser ?? 'Chrome'})`}
                        </span>
                        <span className="block text-3xs text-slate-550 leading-relaxed font-mono">
                          IP: {sess.ipAddress} • Location: {sess.city ? `${sess.city}, ${sess.country}` : 'Local Intranet'}
                        </span>
                        <span className="block text-4xs text-slate-600 mt-1 font-mono">Established: {new Date(sess.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="success" size="sm">ACTIVE</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-2xs text-amber-400 leading-relaxed font-sans rounded-xl mt-4 flex items-start gap-2 select-text shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              If you detect unrecognized sessions or suspicious client IP locations, terminate them immediately or trigger global platform lockdown.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
