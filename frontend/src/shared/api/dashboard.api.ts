import { get, post, put, del } from './client.js';

export const dashboardApi = {
  // Devices API
  getDevices: (params?: any) => get<any>('/devices', params),
  getDeviceById: (id: string) => get<any>(`/devices/${id}`),
  updateDeviceTrust: (id: string, trustScore: number, isTrusted: boolean) =>
    put<any>(`/devices/${id}/trust`, { trustScore, isTrusted }),
  toggleDeviceBlock: (id: string, isBlocked: boolean, blockReason?: string) =>
    put<any>(`/devices/${id}/block`, { isBlocked, blockReason }),

  // Incidents API
  getIncidents: (params?: any) => get<any>('/incidents', params),
  getIncidentById: (id: string) => get<any>(`/incidents/${id}`),
  assignIncident: (id: string, assignedToId: string | null) =>
    put<any>(`/incidents/${id}/assign`, { assignedToId }),
  updateIncidentStatus: (id: string, status: string, explanation: string) =>
    put<any>(`/incidents/${id}/status`, { status, explanation }),
  addIncidentComment: (id: string, message: string) =>
    post<any>(`/incidents/${id}/comments`, { message }),

  // Alerts API
  getAlerts: (params?: any) => get<any>('/alerts', params),
  markAlertAsRead: (id: string) => put<any>(`/alerts/${id}/read`),
  markAllAlertsAsRead: () => put<any>('/alerts/read-all'),

  // Policies API
  getPolicies: () => get<any[]>('/policies'),
  getPolicyById: (id: string) => get<any>(`/policies/${id}`),
  createPolicy: (data: any) => post<any>('/policies', data),
  updatePolicy: (id: string, data: any) => put<any>(`/policies/${id}`, data),
  togglePolicyActive: (id: string, isActive: boolean) =>
    put<any>(`/policies/${id}/toggle`, { isActive }),
  deletePolicy: (id: string) => del<any>(`/policies/${id}`),

  // Audit Logs API
  getAuditLogs: (params?: any) => get<any>('/audit', params),

  // Analytics API
  getStats: () => get<any>('/analytics/stats'),
  getTelemetry: () => get<any>('/analytics/telemetry'),

  // Simulation API
  simulateBruteForce: (userId: string) => post<null>('/simulation/brute-force', { userId }),
  simulateImpossibleTravel: (userId: string) => post<null>('/simulation/impossible-travel', { userId }),
  simulateDataExfiltration: (userId: string) => post<null>('/simulation/data-exfiltration', { userId }),
  resetSimulations: () => post<null>('/simulation/reset'),

  // Users API (needed for dropdown selectors & directory)
  getUsers: (params?: any) => get<any>('/users', params),
  getUserRiskProfile: (id: string) => get<any>(`/users/${id}/risk-profile`),
  getUserLoginHistory: (id: string) => get<any>(`/users/${id}/login-history`),
  deactivateUser: (id: string) => post<any>(`/users/${id}/deactivate`),
  updateUser: (id: string, data: any) => put<any>(`/users/${id}`, data),
};
