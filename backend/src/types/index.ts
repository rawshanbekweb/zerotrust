// ─────────────────────────────────────────────────────────────
// Zero Trust Platform — Core TypeScript Types
// Single source of truth. Frontend mirrors these in shared/types.
// ─────────────────────────────────────────────────────────────

// ─── ENUMERATIONS ────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'CONTAINED'
  | 'RESOLVED'
  | 'CLOSED';

export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'SERVER' | 'UNKNOWN';

export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type PolicyType = 'ACCESS' | 'DEVICE' | 'NETWORK' | 'MFA' | 'SESSION' | 'DATA';

export type PolicyCategory = 'ZERO_TRUST' | 'COMPLIANCE' | 'CUSTOM';

export type PolicyAction = 'ALLOW' | 'DENY' | 'MFA_CHALLENGE' | 'NOTIFY' | 'QUARANTINE';

export type NotificationType = 'ALERT' | 'INCIDENT' | 'SYSTEM' | 'POLICY' | 'RISK_CHANGE';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'VIEWER';

export type LoginFailReason =
  | 'INVALID_PASSWORD'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_INACTIVE'
  | 'MFA_FAILED'
  | 'SUSPICIOUS_LOCATION'
  | 'DEVICE_BLOCKED';

// ─── USER TYPES ──────────────────────────────────────────────

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

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  department?: string;
  jobTitle?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  isActive?: boolean;
  roleId?: string;
}

// ─── AUTH TYPES ───────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface MfaVerifyDto {
  tempToken: string;
  code: string;
}

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

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ─── ROLE & PERMISSION TYPES ──────────────────────────────────

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

export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  permissionIds: string[];
}

// ─── DEVICE TYPES ─────────────────────────────────────────────

export interface DeviceDto {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
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

export interface RegisterDeviceDto {
  name: string;
  type: DeviceType;
  os?: string;
  browser?: string;
  fingerprint: string;
}

// ─── SESSION TYPES ────────────────────────────────────────────

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

// ─── INCIDENT TYPES ───────────────────────────────────────────

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

export interface CreateIncidentDto {
  title: string;
  description: string;
  type: string;
  severity: IncidentSeverity;
  affectedUserId?: string;
  affectedDeviceId?: string;
  sourceIp?: string;
  mitreTactic?: string;
  mitreTechnique?: string;
}

// ─── ALERT TYPES ──────────────────────────────────────────────

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

// ─── AUDIT LOG TYPES ──────────────────────────────────────────

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

// ─── POLICY TYPES ─────────────────────────────────────────────

export interface PolicyRule {
  field: string;         // e.g. "user.riskScore", "device.trustScore", "location.country"
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

export interface CreatePolicyDto {
  name: string;
  displayName: string;
  description?: string;
  type: PolicyType;
  category: PolicyCategory;
  rules: PolicyRule[];
  conditions: string;
  actions: PolicyAction[];
  priority?: number;
}

// ─── RISK ENGINE TYPES ────────────────────────────────────────

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  score: number;          // contribution to total risk score (0–100)
  weight: number;         // multiplier
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

// ─── ANALYTICS TYPES ──────────────────────────────────────────

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

export interface GeoThreatData {
  country: string;
  countryCode: string;
  incidents: number;
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel;
}

// ─── NOTIFICATION TYPES ───────────────────────────────────────

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

// ─── API RESPONSE WRAPPERS ────────────────────────────────────

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

// ─── PAGINATION QUERY ─────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ─── WEBSOCKET EVENT TYPES ────────────────────────────────────

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

// ─── REQUEST CONTEXT (attached by auth middleware) ────────────

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  sessionId: string;
  permissions: string[];
}
