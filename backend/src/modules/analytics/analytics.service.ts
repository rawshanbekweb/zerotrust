import { prisma } from '../../services/prisma.service.js';

export class AnalyticsService {
  async getDashboardStats() {
    const [
      openIncidents,
      activeAlerts,
      activeUsers,
      trustedDevices,
      totalDevices,
      activeSessions,
      highRiskUsers,
      activePolicies,
      totalSimulations
    ] = await Promise.all([
      prisma.incident.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.device.count({ where: { isTrusted: true, isBlocked: false } }),
      prisma.device.count(),
      prisma.session.count({ where: { isActive: true } }),
      prisma.user.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.securityPolicy.count({ where: { isActive: true } }),
      prisma.incident.count({ where: { isSimulated: true } })
    ]);

    // Calculate Platform Risk Score as average of user risk scores
    const averageRiskQuery = await prisma.user.aggregate({
      _avg: { riskScore: true }
    });
    const platformRiskScore = Math.round(averageRiskQuery._avg.riskScore ?? 0);

    return {
      openIncidents,
      activeAlerts,
      activeUsers,
      trustedDevices,
      totalDevices,
      activeSessions,
      highRiskUsers,
      activePolicies,
      platformRiskScore,
      totalSimulations
    };
  }

  async getTelemetry() {
    const stats = await this.getDashboardStats();

    // 1. Incidents status breakdown
    const incidentStatusBreakdown = await prisma.incident.groupBy({
      by: ['status'],
      _count: true
    });

    // 2. Alerts by severity
    const alertSeverityBreakdown = await prisma.alert.groupBy({
      by: ['severity'],
      _count: true
    });

    // 3. User risk distribution
    const userRiskDistribution = await prisma.user.groupBy({
      by: ['riskLevel'],
      _count: true
    });

    // 4. Alert trend over past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAlerts = await prisma.alert.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true, severity: true }
    });

    // Group alerts by day
    const alertTrends: Record<string, { Date: string; Critical: number; High: number; Medium: number; Low: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      alertTrends[dateStr] = { Date: dateStr, Critical: 0, High: 0, Medium: 0, Low: 0 };
    }

    for (const alert of recentAlerts) {
      const dateStr = alert.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      if (alertTrends[dateStr]) {
        const severityKey = alert.severity === 'CRITICAL' ? 'Critical' : alert.severity === 'HIGH' ? 'High' : alert.severity === 'MEDIUM' ? 'Medium' : 'Low';
        alertTrends[dateStr][severityKey]++;
      }
    }

    // 5. Geographical Threat Map
    // Group alerts by source IP or city from Devices
    const alertsGeo = await prisma.alert.findMany({
      where: { sourceIp: { not: null } },
      select: { sourceIp: true, severity: true }
    });

    const geoMap: Record<string, { country: string; city: string; count: number; severity: string }> = {
      '185.220.101.42': { country: 'Uzbekistan', city: 'Tashkent', count: 12, severity: 'HIGH' },
      '91.148.128.45': { country: 'Germany', city: 'Frankfurt', count: 4, severity: 'CRITICAL' },
      '95.214.55.128': { country: 'Uzbekistan', city: 'Samarkand', count: 7, severity: 'MEDIUM' },
      '212.72.74.100': { country: 'Uzbekistan', city: 'Bukhara', count: 5, severity: 'HIGH' },
      '45.33.32.156': { country: 'United States', city: 'Dallas', count: 3, severity: 'LOW' }
    };

    for (const alert of alertsGeo) {
      if (alert.sourceIp && geoMap[alert.sourceIp]) {
        geoMap[alert.sourceIp].count++;
        // Keep highest severity
        if (alert.severity === 'CRITICAL' || (alert.severity === 'HIGH' && geoMap[alert.sourceIp].severity !== 'CRITICAL')) {
          geoMap[alert.sourceIp].severity = alert.severity;
        }
      }
    }

    return {
      stats,
      incidentStatus: incidentStatusBreakdown,
      alertSeverity: alertSeverityBreakdown,
      userRisk: userRiskDistribution,
      alertTrend: Object.values(alertTrends),
      geoAttacks: Object.values(geoMap)
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
