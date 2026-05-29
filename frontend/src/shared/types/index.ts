// ─────────────────────────────────────────────────────────────
// Frontend Shared Types — mirrors backend/src/types/index.ts
// Keep in sync manually or replace with a shared package.
// ─────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'SERVER' | 'UNKNOWN';
export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type PolicyType = 'ACCESS' | 'DEVICE' | 'NETWORK' | 'MFA' | 'SESSION' | 'DATA';
export type PolicyCategory = 'ZERO_TRUST' | 'COMPLIANCE' | 'CUSTOM';
export type PolicyAction = 'ALLOW' | 'DENY' | 'MFA_CHALLENGE' | 'NOTIFY' | 'QUARANTINE';
export type NotificationType = 'ALERT' | 'INCIDENT' | 'SYSTEM' | 'POLICY' | 'RISK_CHANGE';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'VIEWER';

// ─── USER ─────────────────────────────────────────────────────
export interface UserDto {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string | null;
  department: string | null;
  jobTitle: string | null;
  isActive: boolean;
  isMfaEnabled: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  trustScore: number;
  role: RoleDto;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginCity: string | null;
  lastLoginCountry: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  color: string;
  permissions: PermissionDto[];
}

export interface PermissionDto {
  id: string;
  action: string;
  resource: string;
  description: string | null;
}

// ─── AUTH ─────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserDto;
  tokens: AuthTokens;
  requiresMfa: boolean;
  tempToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

// ─── DEVICE ───────────────────────────────────────────────────
export interface DeviceDto {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  fingerprint: string;
  ipAddress: string;
  city: string | null;
  country: string | null;
  trustScore: number;
  isTrusted: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  lastSeenAt: string;
  firstSeenAt: string;
}

// ─── SESSION ──────────────────────────────────────────────────
export interface SessionDto {
  id: string;
  userId: string;
  deviceId: string | null;
  ipAddress: string;
  userAgent: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
}

// ─── INCIDENT ─────────────────────────────────────────────────
export interface IncidentDto {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedUserId: string | null;
  affectedDeviceId: string | null;
  assignedToId: string | null;
  assignedTo: Pick<UserDto, 'id' | 'fullName' | 'avatar'> | null;
  isSimulated: boolean;
  sourceIp: string | null;
  mitreTactic: string | null;
  mitreTechnique: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updates: IncidentUpdateDto[];
}

export interface IncidentUpdateDto {
  id: string;
  incidentId: string;
  authorId: string | null;
  message: string;
  type: 'COMMENT' | 'STATUS_CHANGE' | 'ESCALATION' | 'RESOLUTION';
  createdAt: string;
}

// ─── ALERT ────────────────────────────────────────────────────
export interface AlertDto {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  userId: string | null;
  deviceId: string | null;
  sourceIp: string | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

// ─── AUDIT LOG ────────────────────────────────────────────────
export interface AuditLogDto {
  id: string;
  userId: string | null;
  user: Pick<UserDto, 'id' | 'fullName' | 'avatar'> | null;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  ipAddress: string;
  severity: LogSeverity;
  createdAt: string;
}

// ─── POLICY ───────────────────────────────────────────────────
export interface PolicyRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | boolean | string[];
}

export interface SecurityPolicyDto {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: PolicyType;
  category: PolicyCategory;
  rules: PolicyRule[];
  actions: PolicyAction[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ─── RISK ─────────────────────────────────────────────────────
export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  score: number;
  weight: number;
  triggeredAt: string;
}

export interface RiskProfileDto {
  userId: string;
  currentScore: number;
  level: RiskLevel;
  factors: RiskFactor[];
  lastEvaluatedAt: string;
}

export interface RiskScoreHistoryDto {
  id: string;
  score: number;
  level: RiskLevel;
  delta: number;
  reason: string;
  createdAt: string;
}

// ─── ANALYTICS ────────────────────────────────────────────────
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SecurityOverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalDevices: number;
  trustedDevices: number;
  openIncidents: number;
  criticalIncidents: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  avgRiskScore: number;
  highRiskUsers: number;
  activeSessions: number;
  blockedAttempts24h: number;
}

export interface ThreatTrendData {
  date: string;
  incidents: number;
  alerts: number;
  blockedLogins: number;
  riskScore: number;
}

// ─── NOTIFICATION ─────────────────────────────────────────────
export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: AlertSeverity;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

// ─── API WRAPPERS ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

// ─── WEBSOCKET ────────────────────────────────────────────────
export type WsEventType =
  | 'alert:new'
  | 'incident:created'
  | 'incident:updated'
  | 'risk:changed'
  | 'device:blocked'
  | 'session:terminated'
  | 'threat:detected'
  | 'stats:updated';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}

// ─── UI SPECIFIC ──────────────────────────────────────────────

export interface SidebarNavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
  badgeSeverity?: AlertSeverity;
  children?: SidebarNavItem[];
  requiredPermission?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}
