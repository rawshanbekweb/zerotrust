import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '../../shared/ui/button.js';
import { Input } from '../../shared/ui/input.js';
import { cn } from '../../shared/utils/cn.js';
import { useAuthStore } from '../../store/auth.store.js';
import { authApi } from '../../shared/api/auth.api.js';
import { getApiErrorMessage } from '../../shared/api/client.js';

// ─── Animated background particle ────────────────────────────

function Particle({ index }: { index: number }) {
  const size   = 2 + (index % 3);
  const left   = 5 + (index * 13) % 90;
  const delay  = (index * 0.4) % 4;
  const dur    = 8 + (index * 1.3) % 8;
  const color  = index % 3 === 0 ? 'bg-brand-500' : index % 3 === 1 ? 'bg-cyber-500' : 'bg-brand-400';

  return (
    <motion.div
      className={cn('absolute rounded-full opacity-20', color)}
      style={{ width: size, height: size, left: `${left}%`, bottom: '-10px' }}
      animate={{ y: [0, -(600 + index * 30)], opacity: [0, 0.3, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────

interface LocationState { from?: { pathname: string } }

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  const { setAuth, isAuthenticated } = useAuthStore();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [shakeKey,    setShakeKey]    = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await authApi.login(email, password);
      setAuth(result.user, result.tokens);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredential(role: 'admin' | 'analyst' | 'viewer') {
    const map = {
      admin:   { email: 'admin@zerotrust.uz',             password: 'Admin@ZeroTrust2024' },
      analyst: { email: 'analyst.tashkent@zerotrust.uz', password: 'User@ZeroTrust2024'  },
      viewer:  { email: 'm.karimov@nationalbank.uz',      password: 'User@ZeroTrust2024'  },
    };
    setEmail(map[role].email);
    setPassword(map[role].password);
    setError(null);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-base p-4">

      {/* ── Animated background ─────────────────────────────── */}
      <div className="absolute inset-0 cyber-grid" />
      <div className="absolute inset-0 bg-glow-brand pointer-events-none" />
      {Array.from({ length: 20 }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}

      {/* ── Horizontal scan line ────────────────────────────── */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent pointer-events-none"
        animate={{ y: ['-100vh', '100vh'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── Corner decorations ──────────────────────────────── */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-brand-500/20 rounded-tl-lg" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-brand-500/20 rounded-tr-lg" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-brand-500/20 rounded-bl-lg" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-brand-500/20 rounded-br-lg" />

      {/* ── Main card ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel border border-slate-700/60 shadow-card-hover overflow-hidden">

          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-brand" />

          <div className="p-8">

            {/* ── Logo & title ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-4 mb-8"
            >
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-brand">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-brand-400/40"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-widest text-gradient-brand">
                  ZEROTRUST
                </h1>
                <p className="text-xs text-slate-500 tracking-widest mt-1 uppercase">
                  Security Platform — Uzbekistan
                </p>
              </div>
            </motion.div>

            {/* ── Status indicators ────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-6 mb-6"
            >
              {[
                { label: 'Zero Trust', active: true },
                { label: 'MFA Ready', active: true },
                { label: 'SIEM Active', active: true },
              ].map(({ label, active }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    active ? 'bg-green-400 animate-pulse-glow' : 'bg-slate-600',
                  )} />
                  <span className="text-2xs text-slate-500 font-mono">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* ── Login form ───────────────────────────────── */}
            <motion.form
              key={shakeKey}
              initial={{ opacity: 0 }}
              animate={error ? { x: [0, -8, 8, -6, 6, 0], opacity: 1 } : { opacity: 1 }}
              transition={{ duration: 0.3 }}
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-4"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="name@organization.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                {loading ? 'Authenticating…' : 'Sign In Securely'}
              </Button>
            </motion.form>

            {/* ── Demo credentials ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 space-y-2"
            >
              <p className="text-center text-2xs text-slate-600 uppercase tracking-widest">
                Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'analyst', 'viewer'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => fillDemoCredential(role)}
                    className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-1.5 text-2xs font-medium text-slate-400 hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition-all duration-150 capitalize"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-700/40 bg-slate-900/40 px-8 py-3">
            <p className="text-center text-2xs text-slate-600 font-mono">
              ZERO TRUST · NEVER TRUST · ALWAYS VERIFY · UZBEKISTAN
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
