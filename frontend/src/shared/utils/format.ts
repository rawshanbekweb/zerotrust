import { formatDistanceToNow, format, parseISO } from 'date-fns';
import type { RiskLevel, AlertSeverity, IncidentSeverity } from '../types/index.js';

// ─── DATE ─────────────────────────────────────────────────────

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy, HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy');
}

// ─── RISK LEVEL ───────────────────────────────────────────────

export const riskLevelConfig: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  LOW:      { label: 'Low',      color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  dot: 'bg-green-400'  },
  MEDIUM:   { label: 'Medium',   color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  dot: 'bg-amber-400'  },
  HIGH:     { label: 'High',     color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    dot: 'bg-red-400'    },
  CRITICAL: { label: 'Critical', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', dot: 'bg-purple-400' },
};

export function getRiskConfig(level: RiskLevel) {
  return riskLevelConfig[level] ?? riskLevelConfig.LOW;
}

// ─── SEVERITY ─────────────────────────────────────────────────

export const severityConfig: Record<
  AlertSeverity | IncidentSeverity,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  INFO:     { label: 'Info',     color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   glow: 'shadow-glow-brand'   },
  LOW:      { label: 'Low',      color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  glow: 'shadow-glow-success' },
  MEDIUM:   { label: 'Medium',   color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  glow: 'shadow-glow-warning' },
  HIGH:     { label: 'High',     color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    glow: 'shadow-glow-danger'  },
  CRITICAL: { label: 'Critical', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', glow: 'shadow-glow-danger'  },
};

export function getSeverityConfig(severity: AlertSeverity | IncidentSeverity) {
  return severityConfig[severity] ?? severityConfig.INFO;
}

// ─── NUMBERS ──────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

// ─── RISK SCORE COLOR ─────────────────────────────────────────

export function riskScoreColor(score: number): string {
  if (score >= 85) return 'text-purple-400';
  if (score >= 60) return 'text-red-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-green-400';
}

export function riskScoreLevel(score: number): RiskLevel {
  if (score >= 85) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

// ─── TRUNCATE ─────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

// ─── INITIALS ─────────────────────────────────────────────────

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
