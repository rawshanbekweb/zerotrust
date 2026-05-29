import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle, ShieldAlert, Database, RefreshCw, Terminal, ChevronRight, User } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useUIStore } from '../../store/ui.store.js';

interface TargetUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: { name: string };
  riskScore: number;
}

export default function SimulationPage() {
  const [users, setUsers] = useState<TargetUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ text: string; type: 'info' | 'warn' | 'error' | 'success' }>>([
    { text: 'SYSTEM: Zero Trust Simulation Environment initialized.', type: 'info' },
    { text: 'SYSTEM: Select a target user and launch a cyberattack simulation scenario.', type: 'info' }
  ]);

  const addToast = useUIStore((s) => s.addNotification);

  // Fetch users on load so we can target them
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await dashboardApi.getUsers({ limit: 50 });
        if (response && response.users) {
          setUsers(response.users);
          if (response.users.length > 0) {
            setSelectedUserId(response.users[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load users for simulation', err);
        addLog('ERROR: Failed to load user accounts for targeting.', 'error');
      }
    }
    loadUsers();
  }, []);

  const addLog = (text: string, type: 'info' | 'warn' | 'error' | 'success') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [
      ...prev,
      { text: `[${timestamp}] ${text}`, type }
    ]);
  };

  const handleSimulate = async (type: 'brute-force' | 'impossible-travel' | 'data-exfiltration', label: string) => {
    if (!selectedUserId) {
      addToast({ type: 'warning', title: 'User Required', message: 'Please select a target user first.' });
      return;
    }
    
    const targetUser = users.find((u) => u.id === selectedUserId);
    const targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'selected user';
    
    setIsLoading(type);
    addLog(`LAUNCH: Executing ${label} on target: ${targetName}...`, 'warn');

    try {
      if (type === 'brute-force') {
        await dashboardApi.simulateBruteForce(selectedUserId);
      } else if (type === 'impossible-travel') {
        await dashboardApi.simulateImpossibleTravel(selectedUserId);
      } else if (type === 'data-exfiltration') {
        await dashboardApi.simulateDataExfiltration(selectedUserId);
      }

      addLog(`SUCCESS: Simulation of ${label} completed. Incident raised in backend database.`, 'success');
      addLog(`SYSTEM: WebSocket alert broadcasted. Risk score spiked for target user.`, 'info');
      addToast({
        type: 'success',
        title: 'Simulation Complete',
        message: `${label} scenario triggered successfully against ${targetName}.`
      });

      // Reload users to see updated risk scores
      const response = await dashboardApi.getUsers({ limit: 50 });
      if (response && response.users) {
        setUsers(response.users);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message ?? error.message ?? 'Unknown error';
      addLog(`FAILED: Scenario execution error: ${errMsg}`, 'error');
      addToast({ type: 'error', title: 'Simulation Failed', message: errMsg });
    } finally {
      setIsLoading(null);
    }
  };

  const handleReset = async () => {
    setIsLoading('reset');
    addLog('SYSTEM: Resetting threat simulation datasets in database...', 'warn');
    try {
      await dashboardApi.resetSimulations();
      addLog('SUCCESS: Simulation database cleared. User risk levels restored to LOW (10/100).', 'success');
      addToast({ type: 'success', title: 'Database Reset', message: 'Simulation datasets successfully cleared.' });
      
      // Reload users to see reset risk scores
      const response = await dashboardApi.getUsers({ limit: 50 });
      if (response && response.users) {
        setUsers(response.users);
        if (response.users.length > 0 && !selectedUserId) {
          setSelectedUserId(response.users[0].id);
        }
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message ?? error.message ?? 'Unknown error';
      addLog(`FAILED: Database reset error: ${errMsg}`, 'error');
      addToast({ type: 'error', title: 'Reset Failed', message: errMsg });
    } finally {
      setIsLoading(null);
    }
  };

  const selectedUserObj = users.find((u) => u.id === selectedUserId);

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-400" />
            Threat Simulation Sandbox
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Test policy constraints and monitor real-time incident routing workflows
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isLoading !== null}
          className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/60 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading === 'reset' ? 'animate-spin' : ''}`} />
          Reset Sandbox
        </button>
      </div>

      {/* ─── Main Content Layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Targeting & Simulation Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Target Selector Card */}
          <div className="glass-card p-5 border border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              1. Select Simulation Target Account
            </h2>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">User Account</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/65 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/80 cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUserObj && (
                <div className="flex-1 flex gap-4 p-3 bg-slate-850/50 rounded-xl border border-slate-800/40">
                  <div className="flex-1">
                    <span className="block text-2xs text-slate-500 font-semibold uppercase">Current Risk Score</span>
                    <span className={`text-xl font-bold font-mono ${
                      selectedUserObj.riskScore >= 85 ? 'text-purple-400' :
                      selectedUserObj.riskScore >= 60 ? 'text-red-400' :
                      selectedUserObj.riskScore >= 35 ? 'text-amber-400' :
                      'text-green-400'
                    }`}>
                      {selectedUserObj.riskScore}/100
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="block text-2xs text-slate-500 font-semibold uppercase">Target Role</span>
                    <span className="text-sm font-semibold text-slate-350">{selectedUserObj.role.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulation Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Scenario 1: Brute Force */}
            <motion.div
              whileHover={{ y: -2 }}
              className="glass-card p-5 border border-slate-700/40 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">Brute Force</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Triggers 147 failed logins from a Tor Exit IP (185.220.101.42). Increases target risk score by 35 points.
                </p>
              </div>
              <button
                onClick={() => handleSimulate('brute-force', 'Brute Force Attack')}
                disabled={isLoading !== null}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/35 px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isLoading === 'brute-force' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Trigger Scenario
              </button>
            </motion.div>

            {/* Scenario 2: Impossible Travel */}
            <motion.div
              whileHover={{ y: -2 }}
              className="glass-card p-5 border border-slate-700/40 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 font-sans">Impossible Travel</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Simulates simultaneous authentications from Tashkent and Frankfurt (IP 91.148.128.45). Spikes user risk score by 50.
                </p>
              </div>
              <button
                onClick={() => handleSimulate('impossible-travel', 'Impossible Travel Anomaly')}
                disabled={isLoading !== null}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/35 px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isLoading === 'impossible-travel' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Trigger Scenario
              </button>
            </motion.div>

            {/* Scenario 3: Data Exfiltration */}
            <motion.div
              whileHover={{ y: -2 }}
              className="glass-card p-5 border border-slate-700/40 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Database className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">Data Exfiltration</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Simulates a suspicious outbound bulk database dump (12.4 GB) to an external US server. Spikes target risk by 40.
                </p>
              </div>
              <button
                onClick={() => handleSimulate('data-exfiltration', 'Data Exfiltration Attack')}
                disabled={isLoading !== null}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-400/35 px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isLoading === 'data-exfiltration' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Trigger Scenario
              </button>
            </motion.div>

          </div>
        </div>

        {/* Right 1 Column: Simulated Event Logs Console */}
        <div className="lg:col-span-1">
          <div className="glass-card border border-slate-700/40 h-full flex flex-col min-h-[420px] overflow-hidden">
            <div className="border-b border-slate-700/50 px-5 py-4 flex items-center justify-between shrink-0 bg-slate-900/30">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                Security Simulation Terminal
              </h3>
              <button
                onClick={() => setConsoleLogs([{ text: 'SYSTEM: Logs cleared.', type: 'info' }])}
                className="text-2xs text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 p-4 bg-black/45 font-mono text-2xs overflow-y-auto space-y-2.5 max-h-[380px] lg:max-h-[none] select-text">
              {consoleLogs.map((logItem, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-1.5 break-all ${
                    logItem.type === 'error' ? 'text-red-400' :
                    logItem.type === 'warn' ? 'text-amber-400' :
                    logItem.type === 'success' ? 'text-green-400' :
                    'text-slate-400'
                  }`}
                >
                  <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-slate-600" />
                  <span>{logItem.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
