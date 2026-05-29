import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Trash2, ToggleLeft, ToggleRight, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { useUIStore } from '../../store/ui.store.js';
import { Badge } from '../../shared/ui/badge.js';

interface PolicyRule {
  field: 'user.isActive' | 'user.riskScore' | 'device.isTrusted' | 'device.trustScore' | 'device.isBlocked' | 'location.country';
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';
  value: any;
}

interface PolicyItem {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  type: 'ACCESS' | 'DEVICE' | 'NETWORK' | 'MFA' | 'SESSION' | 'DATA';
  category: 'ZERO_TRUST' | 'COMPLIANCE' | 'CUSTOM';
  rules: string; // JSON String
  conditions: string; // JSON String
  actions: string; // JSON String
  isActive: boolean;
  priority: number;
  isSystem: boolean;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Policy Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ACCESS');
  const [category] = useState('ZERO_TRUST');
  const [priority, setPriority] = useState(50);
  const [actions, setActions] = useState<string[]>(['ALLOW']);
  
  // Custom dynamic rules builder rows
  const [rules, setRules] = useState<PolicyRule[]>([
    { field: 'user.riskScore', operator: 'lt', value: '70' }
  ]);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getPolicies();
      if (data) {
        setPolicies(data);
      }
    } catch (err) {
      console.error('Failed to load policies', err);
      addToast({ type: 'error', title: 'Loading Error', message: 'Failed to fetch security policies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      const targetActive = !currentlyActive;
      await dashboardApi.togglePolicyActive(id, targetActive);
      
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: targetActive } : p))
      );
      
      addToast({
        type: 'success',
        title: targetActive ? 'Policy Enabled' : 'Policy Disabled',
        message: `Policy status updated successfully.`
      });
    } catch (err) {
      console.error('Failed to toggle policy state', err);
      addToast({ type: 'error', title: 'Operation Failed', message: 'Could not change policy status.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.deletePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      addToast({ type: 'success', title: 'Policy Deleted', message: 'Policy removed permanently.' });
    } catch (err) {
      console.error('Failed to delete policy', err);
      addToast({ type: 'error', title: 'Deletion Failed', message: 'Could not delete policy.' });
    }
  };

  const handleAddRuleRow = () => {
    setRules((prev) => [
      ...prev,
      { field: 'device.trustScore', operator: 'gte', value: '50' }
    ]);
  };

  const handleRemoveRuleRow = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, key: keyof PolicyRule, val: any) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        return {
          ...r,
          [key]: val
        };
      })
    );
  };

  const handleToggleAction = (act: string) => {
    setActions((prev) => {
      if (prev.includes(act)) {
        return prev.filter((a) => a !== act);
      }
      return [...prev, act];
    });
  };

  const handleCreatePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !displayName) {
      addToast({ type: 'warning', title: 'Required Fields', message: 'Please fill name and display title.' });
      return;
    }
    if (rules.length === 0) {
      addToast({ type: 'warning', title: 'Rules Required', message: 'Please define at least one policy rule constraint.' });
      return;
    }
    if (actions.length === 0) {
      addToast({ type: 'warning', title: 'Actions Required', message: 'Please choose at least one policy matching action.' });
      return;
    }

    try {
      // Coerce numeric rules where necessary
      const formattedRules = rules.map((r) => {
        const isNumeric = ['user.riskScore', 'device.trustScore', 'priority'].includes(r.field);
        const val = isNumeric ? Number(r.value) : r.value === 'true' ? true : r.value === 'false' ? false : r.value;
        return {
          ...r,
          value: val
        };
      });

      await dashboardApi.createPolicy({
        name,
        displayName,
        description,
        type,
        category,
        rules: formattedRules,
        conditions: { operator: 'AND' },
        actions,
        priority: Number(priority)
      });

      addToast({ type: 'success', title: 'Policy Enacted', message: `Dynamic Zero Trust policy ${displayName} created.` });
      setCreateModalOpen(false);
      
      // Clear forms
      setName('');
      setDisplayName('');
      setDescription('');
      setPriority(50);
      setRules([{ field: 'user.riskScore', operator: 'lt', value: '70' }]);
      setActions(['ALLOW']);

      fetchPolicies();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message ?? err.message ?? 'Unknown error';
      addToast({ type: 'error', title: 'Enactment Failed', message: errMsg });
    }
  };

  const getRuleDescription = (ruleString: string) => {
    try {
      const ruleArray: PolicyRule[] = JSON.parse(ruleString);
      return ruleArray.map((r, index) => {
        const fieldLabel = r.field.replace('user.', 'User ').replace('device.', 'Device ').replace('location.', 'Location ');
        const opLabel = r.operator === 'eq' ? 'is equal to' : r.operator === 'neq' ? 'is not' : r.operator === 'lt' ? 'less than' : r.operator === 'gte' ? 'greater than or equal to' : r.operator;
        return (
          <div key={index} className="flex items-center gap-1.5 text-2xs text-slate-400 font-mono">
            <span className="text-slate-550">•</span>
            <span className="text-cyan-400">{fieldLabel}</span>
            <span className="text-slate-500">{opLabel}</span>
            <span className="text-slate-300 font-semibold">{String(r.value)}</span>
          </div>
        );
      });
    } catch {
      return <span className="text-2xs text-slate-550 italic">Complex custom logic rules</span>;
    }
  };

  const getActionsList = (actionsString: string) => {
    try {
      const actArray: string[] = JSON.parse(actionsString);
      return actArray.map((act) => {
        const color = act === 'DENY' ? 'critical' : act === 'MFA_CHALLENGE' ? 'warning' : act === 'NOTIFY' ? 'info' : 'success';
        return (
          <Badge key={act} variant={color as any} size="sm" className="mr-1">
            {act.replace('_', ' ')}
          </Badge>
        );
      });
    } catch {
      return <Badge variant="info">ALLOW</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Zero Trust Policy Builder
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define dynamic rule evaluation models for identity access gateway containing sessions and devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPolicies}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-755 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            Enact Policy
          </button>
        </div>
      </div>

      {/* ─── Policies List ───────────────────────────────────── */}
      {loading && policies.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-400 mb-3" />
          Synchronizing security policy registries...
        </div>
      ) : policies.length === 0 ? (
        <div className="glass-card p-12 border border-slate-700/40 text-center text-slate-500 flex flex-col items-center justify-center">
          <AlertCircle className="h-10 w-10 text-slate-750 mb-3" />
          <h3 className="text-slate-300 font-semibold">No Policies Found</h3>
          <p className="text-xs text-slate-500 mt-1">Please create a policy to start enforcing Zero Trust verification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {policies.map((policy) => (
              <motion.div
                key={policy.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`glass-card p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors ${
                  policy.isActive 
                    ? 'border-slate-700/40 bg-slate-900/40 hover:shadow-card-hover' 
                    : 'border-slate-800/40 bg-slate-900/10 opacity-60'
                }`}
              >
                {/* Left block title/desc */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">{policy.displayName}</h3>
                    <span className="bg-slate-800 text-slate-400 text-5xs px-2 py-0.5 rounded font-mono uppercase tracking-widest font-bold">
                      Priority: {policy.priority}
                    </span>
                    {policy.isSystem && (
                      <span className="bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 text-5xs px-2 py-0.5 rounded font-mono uppercase tracking-widest font-bold">System</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{policy.description ?? 'No description provided.'}</p>
                  
                  {/* Visual constraints */}
                  <div className="pt-3 space-y-1">
                    <span className="block text-4xs uppercase tracking-wider text-slate-550 font-bold">Constraints Evaluation</span>
                    <div className="space-y-1 p-2 bg-slate-950/20 rounded-lg border border-slate-900/40 max-w-lg">
                      {getRuleDescription(policy.rules)}
                    </div>
                  </div>
                </div>

                {/* Right block: actions, active toggle, delete */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                  
                  {/* Actions */}
                  <div className="flex flex-col items-start md:items-end gap-1.5">
                    <span className="block text-4xs uppercase tracking-wider text-slate-550 font-bold">Matching Actions</span>
                    <div className="flex items-center">
                      {getActionsList(policy.actions)}
                    </div>
                  </div>

                  {/* Operational controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(policy.id, policy.isActive)}
                      className={`flex items-center justify-center shrink-0 transition-colors ${
                        policy.isActive ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                      title={policy.isActive ? 'Deactivate Policy' : 'Activate Policy'}
                    >
                      {policy.isActive ? (
                        <ToggleRight className="h-9 w-9 cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 cursor-pointer" />
                      )}
                    </button>
                    
                    {!policy.isSystem && (
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                        title="Delete Policy"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Create Policy Modal ────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-5 my-8 select-text"
          >
            {/* Modal Title */}
            <div className="pb-3 border-b border-slate-800/65">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                Configure Zero Trust Access Rule
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure criteria conditions and enforce real-time session matching constraints.</p>
            </div>

            <form onSubmit={handleCreatePolicySubmit} className="space-y-4">
              
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unique Identifier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., block-suspicious-country"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-emerald-500/70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Block Suspicious Country Access"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-emerald-500/70"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Automatically quarantine connection if source location is outside authorized zones."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-emerald-500/70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Rule Category Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none cursor-pointer"
                  >
                    <option value="ACCESS">Access Control</option>
                    <option value="DEVICE">Device Assessment</option>
                    <option value="NETWORK">Network Security</option>
                    <option value="MFA">Step-up MFA</option>
                    <option value="SESSION">Session Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Evaluation Priority (1 - 100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none focus:border-emerald-500/70 font-mono"
                  />
                </div>
              </div>

              {/* Rules rows list */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-medium text-slate-400">Policy Rules (AND conditions)</span>
                  <button
                    type="button"
                    onClick={handleAddRuleRow}
                    className="text-emerald-400 hover:text-emerald-350 transition-colors text-2xs font-semibold uppercase tracking-wider flex items-center gap-1"
                  >
                    + Add Condition
                  </button>
                </div>

                <div className="space-y-2">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-950/30 rounded-xl border border-slate-800/40">
                      {/* Field */}
                      <select
                        value={rule.field}
                        onChange={(e) => handleRuleChange(idx, 'field', e.target.value)}
                        className="bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none flex-1 cursor-pointer"
                      >
                        <option value="user.riskScore">User Risk Score (0-100)</option>
                        <option value="device.trustScore">Device Trust Score (0-100)</option>
                        <option value="device.isTrusted">Device Trusted Status (true/false)</option>
                        <option value="device.isBlocked">Device Blocked Status (true/false)</option>
                        <option value="user.isActive">User Active (true/false)</option>
                        <option value="location.country">Location Country (String)</option>
                      </select>

                      {/* Operator */}
                      <select
                        value={rule.operator}
                        onChange={(e) => handleRuleChange(idx, 'operator', e.target.value)}
                        className="bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="eq">is equal to (=)</option>
                        <option value="neq">is not equal to (!=)</option>
                        <option value="lt">less than (&lt;)</option>
                        <option value="lte">less or equal (&lt;=)</option>
                        <option value="gt">greater than (&gt;)</option>
                        <option value="gte">greater or equal (&gt;=)</option>
                      </select>

                      {/* Value input */}
                      <input
                        type="text"
                        required
                        placeholder="e.g. 70, true, Uzbekistan"
                        value={rule.value}
                        onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                        className="bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-205 focus:outline-none flex-1 font-mono"
                      />

                      {/* Remove row */}
                      {rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRuleRow(idx)}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className="block text-xs font-medium text-slate-400">Enforcement Action on Condition Match</span>
                <div className="flex flex-wrap gap-4 pt-1">
                  {['ALLOW', 'DENY', 'MFA_CHALLENGE', 'NOTIFY'].map((act) => (
                    <label key={act} className="flex items-center gap-2 text-xs text-slate-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={actions.includes(act)}
                        onChange={() => handleToggleAction(act)}
                        className="h-4 w-4 bg-slate-950 border border-slate-700 rounded text-emerald-500 focus:ring-0 focus:outline-none"
                      />
                      {act.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/65">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-slate-700 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-350 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 px-4 py-2 text-xs font-semibold transition-colors animate-pulse-glow"
                >
                  Enact & Enforce
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
