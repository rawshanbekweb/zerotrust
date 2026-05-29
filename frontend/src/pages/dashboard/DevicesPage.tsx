import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Tablet, Cpu, RefreshCw, Search, ShieldAlert, Lock, Unlock, HelpCircle, MapPin } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useUIStore } from '../../store/ui.store.js';

interface DeviceItem {
  id: string;
  name: string;
  type: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';
  os?: string | null;
  browser?: string | null;
  fingerprint: string;
  ipAddress: string;
  city?: string | null;
  country?: string | null;
  trustScore: number;
  isTrusted: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  lastSeenAt: string;
  user: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOS, setFilterOS] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states for blocking a device
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDeviceId, setBlockDeviceId] = useState<string | null>(null);
  const [blockReasonText, setBlockReasonText] = useState('');

  const addToast = useUIStore((s) => s.addNotification);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;

      const data = await dashboardApi.getDevices(params);
      if (data && data.devices) {
        let filtered = data.devices as DeviceItem[];
        
        // Frontend filtering for fine-grained status/OS matching
        if (filterOS !== 'all') {
          filtered = filtered.filter((d) => d.os?.toLowerCase().includes(filterOS.toLowerCase()));
        }
        if (filterStatus === 'trusted') {
          filtered = filtered.filter((d) => d.isTrusted && !d.isBlocked);
        } else if (filterStatus === 'blocked') {
          filtered = filtered.filter((d) => d.isBlocked);
        } else if (filterStatus === 'untrusted') {
          filtered = filtered.filter((d) => !d.isTrusted && !d.isBlocked);
        }

        setDevices(filtered);
      }
    } catch (err) {
      console.error('Failed to load devices', err);
      addToast({ type: 'error', title: 'Loading Error', message: 'Failed to fetch registered devices.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [search, filterOS, filterStatus]);

  const handleToggleTrust = async (id: string, currentlyTrusted: boolean, currentScore: number) => {
    try {
      const targetTrust = !currentlyTrusted;
      // If trusting, set score to 90. If untrusting, lower to 45
      const targetScore = targetTrust ? Math.max(80, currentScore) : 45;

      await dashboardApi.updateDeviceTrust(id, targetScore, targetTrust);
      
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isTrusted: targetTrust, trustScore: targetScore } : d))
      );
      
      addToast({
        type: 'success',
        title: 'Trust State Updated',
        message: targetTrust ? 'Device is now marked as trusted.' : 'Device is now marked as untrusted.'
      });
    } catch (err) {
      console.error('Failed to toggle device trust', err);
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not change device trust state.' });
    }
  };

  const handleBlockRequest = (id: string) => {
    setBlockDeviceId(id);
    setBlockReasonText('');
    setBlockModalOpen(true);
  };

  const handleConfirmBlock = async () => {
    if (!blockDeviceId) return;
    try {
      await dashboardApi.toggleDeviceBlock(blockDeviceId, true, blockReasonText);
      
      setDevices((prev) =>
        prev.map((d) =>
          d.id === blockDeviceId
            ? { ...d, isBlocked: true, blockReason: blockReasonText || 'Blocked by Administrator', trustScore: 10, isTrusted: false }
            : d
        )
      );

      addToast({
        type: 'success',
        title: 'Device Isolated',
        message: 'Device has been blocked. All active sessions terminated.'
      });
      setBlockModalOpen(false);
    } catch (err) {
      console.error('Failed to block device', err);
      addToast({ type: 'error', title: 'Isolation Failed', message: 'Could not block device.' });
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await dashboardApi.toggleDeviceBlock(id, false);
      
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isBlocked: false, blockReason: null, trustScore: 50 } : d))
      );

      addToast({ type: 'success', title: 'Device Re-admitted', message: 'Device is unblocked.' });
    } catch (err) {
      console.error('Failed to unblock device', err);
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not unblock device.' });
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'DESKTOP': return <Monitor className="h-5 w-5" />;
      case 'MOBILE':  return <Smartphone className="h-5 w-5" />;
      case 'TABLET':  return <Tablet className="h-5 w-5" />;
      default:         return <Cpu className="h-5 w-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-cyan-400" />
            Device Trust Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and quarantine endpoints based on cryptographic fingerprints and hardware risk signatures
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Filter & Search Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
          <input
            type="text"
            placeholder="Search by device name, OS, IP, user email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/65 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-cyan-500/80"
          />
        </div>

        {/* OS Filter */}
        <select
          value={filterOS}
          onChange={(e) => setFilterOS(e.target.value)}
          className="bg-slate-900 border border-slate-700/65 rounded-xl px-3.5 py-2 text-xs text-slate-350 focus:outline-none cursor-pointer"
        >
          <option value="all">All Operating Systems</option>
          <option value="Windows">Windows</option>
          <option value="macOS">macOS</option>
          <option value="Linux">Linux</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700/65 rounded-xl px-3.5 py-2 text-xs text-slate-350 focus:outline-none cursor-pointer"
        >
          <option value="all">All Trust Statuses</option>
          <option value="trusted">Trusted Only</option>
          <option value="untrusted">Untrusted Only</option>
          <option value="blocked">Quarantined / Blocked</option>
        </select>

      </div>

      {/* ─── Devices Grid ────────────────────────────────────── */}
      {loading && devices.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-400 mb-3" />
          Analyzing connected endpoint profiles...
        </div>
      ) : devices.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500 flex flex-col items-center justify-center">
          <HelpCircle className="h-10 w-10 text-slate-750 mb-3" />
          <h3 className="text-slate-300 font-semibold">No Devices Found</h3>
          <p className="text-xs text-slate-500 mt-1">No hardware records matched your search query or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {devices.map((device) => (
              <motion.div
                key={device.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`glass-card p-5 border relative overflow-hidden flex flex-col justify-between ${
                  device.isBlocked
                    ? 'border-red-500/30 bg-red-950/5 hover:shadow-glow-danger'
                    : device.isTrusted
                    ? 'border-green-500/20 bg-slate-900/45 hover:border-green-500/30'
                    : 'border-slate-700/40 hover:border-slate-650 bg-slate-900/40 hover:shadow-card-hover'
                }`}
              >
                {/* Visual Status Indicator */}
                {device.isBlocked && (
                  <div className="absolute top-0 right-0 bg-red-500/15 border-b border-l border-red-500/30 px-3 py-1 text-4xs font-bold font-mono tracking-widest text-red-400 uppercase rounded-bl-lg">
                    QUARANTINE
                  </div>
                )}
                {device.isTrusted && !device.isBlocked && (
                  <div className="absolute top-0 right-0 bg-green-500/10 border-b border-l border-green-500/20 px-3 py-1 text-4xs font-bold font-mono tracking-widest text-green-400 uppercase rounded-bl-lg">
                    TRUSTED
                  </div>
                )}

                {/* Device Title OS block */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${
                      device.isBlocked ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      device.isTrusted ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      'bg-slate-800 border-slate-700 text-slate-350'
                    }`}>
                      {getDeviceIcon(device.type)}
                    </div>
                    <div className="min-w-0 pr-10">
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{device.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{device.os ?? 'Unknown OS'} • {device.browser ?? 'Unknown Browser'}</p>
                    </div>
                  </div>

                  {/* Device Metadata */}
                  <div className="mt-4 space-y-2 p-3 bg-slate-900/30 rounded-xl border border-slate-800/40 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authorized User</span>
                      <span className="text-slate-300 font-medium">{device.user.firstName} {device.user.lastName}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">IP Address</span>
                      <span className="text-slate-300">{device.ipAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Geographic Location</span>
                      <span className="text-slate-350 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-550" />
                        {device.city ? `${device.city}, ${device.country}` : 'Unknown Location'}
                      </span>
                    </div>
                    {device.isBlocked && device.blockReason && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-800/60 text-2xs text-red-400 leading-relaxed">
                        <strong>Reason:</strong> {device.blockReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Actions Foot */}
                <div className="flex items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border font-bold text-xs font-mono shrink-0 ${getScoreColor(device.trustScore)}`}>
                      {device.trustScore}
                    </div>
                    <div>
                      <span className="block text-4xs uppercase tracking-widest text-slate-500 font-semibold">Trust Index</span>
                      <span className="text-2xs text-slate-400 font-medium">Rating: {device.trustScore >= 75 ? 'Optimal' : device.trustScore >= 40 ? 'Medium Risk' : 'Critical'}</span>
                    </div>
                  </div>

                  {/* Operational Buttons */}
                  <div className="flex items-center gap-2">
                    {device.isBlocked ? (
                      <button
                        onClick={() => handleUnblock(device.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Unblock
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleTrust(device.id, device.isTrusted, device.trustScore)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                            device.isTrusted
                              ? 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                          }`}
                        >
                          {device.isTrusted ? 'Untrust' : 'Trust'}
                        </button>
                        
                        <button
                          onClick={() => handleBlockRequest(device.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                          title="Block Device"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Block Device Prompt Modal ──────────────────────── */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400 animate-pulse" />
                Isolate & Block Endpoint?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Blocking this device will automatically quarantine its trust score and **instantly terminate all active authentication sessions** associated with it. The user will be signed out immediately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Block / Isolation Reason</label>
              <textarea
                placeholder="e.g., Compromised OS detected, unauthorized travel alert triggered, or stolen laptop reported."
                value={blockReasonText}
                onChange={(e) => setBlockReasonText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/80 h-20 resize-none placeholder-slate-650"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBlockModalOpen(false)}
                className="rounded-xl border border-slate-700 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-350 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmBlock}
                className="rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-500/20 px-4 py-2 text-xs font-semibold transition-colors"
              >
                Confirm Isolation
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
