import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Users, Globe, TrendingUp } from 'lucide-react';
import { dashboardApi } from '../../shared/api/dashboard.api.js';
import { Badge } from '../../shared/ui/badge.js';
import { useUIStore } from '../../store/ui.store.js';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#a855f7', // purple
  HIGH:     '#ef4444', // red
  MEDIUM:   '#f59e0b', // amber
  LOW:      '#06b6d4', // cyan
  INFO:     '#64748b'  // slate
};

export default function AnalyticsPage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const addToast = useUIStore((s) => s.addNotification);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getTelemetry();
      if (data) {
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to load telemetry', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch telemetry metrics.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  if (loading && !telemetry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
        Compiling analytical engine telemetry...
      </div>
    );
  }

  // Pre-process Pie Chart data
  const pieData = telemetry?.alertSeverity?.map((item: any) => ({
    name: item.severity,
    value: item._count,
    color: SEVERITY_COLORS[item.severity] ?? '#6366f1'
  })) ?? [];

  // Pre-process Bar Chart data
  const userRiskData = telemetry?.userRisk?.map((item: any) => ({
    name: item.riskLevel,
    Users: item._count
  })) ?? [];

  // Sort risk levels logically for chart presentation
  const riskOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  userRiskData.sort((a: any, b: any) => riskOrder.indexOf(a.name) - riskOrder.indexOf(b.name));

  const stats = telemetry?.stats ?? {};

  return (
    <div className="p-6 space-y-6">
      
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            Security Analytics Console
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aggregated threat intelligence telemetry, alert rate vectors, and user profile risk metrics
          </p>
        </div>
        <button
          onClick={fetchTelemetry}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Telemetry Summary Blocks ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Platform Risk Score', value: `${stats.platformRiskScore ?? 0}/100`, desc: 'Average threat rating', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Open Incidents', value: stats.openIncidents ?? 0, desc: 'Under active review', icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Compliance Policies', value: stats.activePolicies ?? 0, desc: 'Enforcing access rules', icon: Users, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Threat Simulations', value: stats.totalSimulations ?? 0, desc: 'Scenarios completed', icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' }
        ].map((block, idx) => (
          <div key={idx} className={`glass-card p-4 border rounded-xl flex items-center justify-between ${block.bg}`}>
            <div>
              <span className="block text-4xs uppercase tracking-wider font-semibold text-slate-500">{block.label}</span>
              <span className="block text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">{block.value}</span>
              <span className="text-3xs text-slate-450">{block.desc}</span>
            </div>
            <div className={`p-3 rounded-lg bg-black/15 flex items-center justify-center shrink-0 ${block.color}`}>
              <block.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ─── Recharts Graph Rows ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (2 columns) */}
        <div className="lg:col-span-2 glass-card p-5 border border-slate-700/40 flex flex-col justify-between min-h-[340px]">
          <div className="pb-3 border-b border-slate-800/60 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-slate-205 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Alert Rate Frequency Trend (Past 7 Days)
            </h3>
          </div>
          
          <div className="flex-1 min-h-[220px] pt-4 select-none">
            {telemetry?.alertTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry.alertTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEVERITY_COLORS['CRITICAL']} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={SEVERITY_COLORS['CRITICAL']} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEVERITY_COLORS['HIGH']} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={SEVERITY_COLORS['HIGH']} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.2)" />
                  <XAxis dataKey="Date" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                  <Area type="monotone" dataKey="Critical" stroke={SEVERITY_COLORS['CRITICAL']} fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} />
                  <Area type="monotone" dataKey="High" stroke={SEVERITY_COLORS['HIGH']} fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Medium" stroke={SEVERITY_COLORS['MEDIUM']} fillOpacity={0} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Low" stroke={SEVERITY_COLORS['LOW']} fillOpacity={0} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 italic">No trend data available</div>
            )}
          </div>
        </div>

        {/* Severity Pie Chart (1 column) */}
        <div className="lg:col-span-1 glass-card p-5 border border-slate-700/40 flex flex-col justify-between min-h-[340px]">
          <div className="pb-3 border-b border-slate-800/60 shrink-0">
            <h3 className="text-xs font-semibold text-slate-205">Alert Severity Distribution</h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-[220px] pt-4 select-none">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 2px ${entry.color}44)` }} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', color: '#f1f5f9' }}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 italic">No alerts logged</div>
            )}
          </div>
        </div>

      </div>

      {/* ─── Second Row: Users Risk & Geo Attack Map ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Risk Bar Chart (1 column) */}
        <div className="lg:col-span-1 glass-card p-5 border border-slate-700/40 flex flex-col justify-between min-h-[340px]">
          <div className="pb-3 border-b border-slate-800/60 shrink-0">
            <h3 className="text-xs font-semibold text-slate-205">User Risk Level Distribution</h3>
          </div>
          
          <div className="flex-1 min-h-[220px] pt-4 select-none">
            {userRiskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userRiskData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', color: '#f1f5f9' }}
                  />
                  <Bar dataKey="Users" radius={[6, 6, 0, 0]}>
                    {userRiskData.map((entry: any, index: number) => {
                      const color = entry.name === 'CRITICAL' ? SEVERITY_COLORS['CRITICAL'] : entry.name === 'HIGH' ? SEVERITY_COLORS['HIGH'] : entry.name === 'MEDIUM' ? SEVERITY_COLORS['MEDIUM'] : SEVERITY_COLORS['LOW'];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 italic">No user risk profiles compiled</div>
            )}
          </div>
        </div>

        {/* Geo Threat Map Grid (2 columns) */}
        <div className="lg:col-span-2 glass-card p-5 border border-slate-700/40 flex flex-col justify-between min-h-[340px]">
          <div className="pb-3 border-b border-slate-800/60 shrink-0">
            <h3 className="text-xs font-semibold text-slate-205 flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-400" />
              Geo-Threat Geolocation Vector Mapping
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-[220px] pt-4 select-text">
            {telemetry?.geoAttacks && telemetry.geoAttacks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Country</th>
                      <th className="py-2.5 px-3">City Location</th>
                      <th className="py-2.5 px-3 text-right">Event Count</th>
                      <th className="py-2.5 px-3 text-right">Severity Vector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {telemetry.geoAttacks.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-350">{item.country}</td>
                        <td className="py-3 px-3 text-slate-400">{item.city}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-200">{item.count} events</td>
                        <td className="py-3 px-3 text-right">
                          <Badge variant={item.severity.toLowerCase() as any} size="sm">
                            {item.severity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 italic">No geographic events mapped</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
