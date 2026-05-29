import { prisma } from '../../services/prisma.service.js';
import { log } from '../../utils/logger.js';
import type { Server as SocketServer } from 'socket.io';

export class RiskService {
  private ioInstance: SocketServer | null = null;

  setIo(io: SocketServer) {
    this.ioInstance = io;
  }

  getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 85) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
  }

  async evaluateRisk(
    userId: string,
    reason: string,
    delta: number,
    metadata?: Record<string, any>
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { riskHistory: true }
    });

    if (!user) {
      log.error(`Failed to evaluate risk: User ${userId} not found`);
      return null;
    }

    // 1. Calculate new score clamped between 0 and 100
    const oldScore = user.riskScore;
    const newScore = Math.max(0, Math.min(100, oldScore + delta));
    const newLevel = this.getRiskLevel(newScore);
    const newTrustScore = 100 - newScore;

    // 2. Update User risk profile in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        riskScore: newScore,
        riskLevel: newLevel,
        trustScore: newTrustScore
      }
    });

    // 3. Upsert RiskProfile model
    const profile = await prisma.riskProfile.upsert({
      where: { userId },
      update: {
        currentScore: newScore,
        level: newLevel,
        factors: JSON.stringify(metadata?.factors ?? []),
        lastEvaluatedAt: new Date()
      },
      create: {
        userId,
        currentScore: newScore,
        level: newLevel,
        factors: JSON.stringify(metadata?.factors ?? []),
      }
    });

    // 4. Record entry in RiskScoreHistory
    const historyEntry = await prisma.riskScoreHistory.create({
      data: {
        userId,
        profileId: profile.id,
        score: newScore,
        level: newLevel,
        delta,
        reason,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    log.info(`Risk score updated for user ${user.username}: ${oldScore} -> ${newScore} (${newLevel})`, {
      userId,
      reason,
      delta
    });

    // 5. Create System Notification for user if risk level changed or is high
    if (newLevel !== user.riskLevel || newScore >= 60) {
      await prisma.notification.create({
        data: {
          userId,
          title: `Risk Profile Update: ${newLevel}`,
          message: `Your account risk profile was updated to ${newLevel} due to: ${reason}`,
          type: 'RISK_CHANGE',
          severity: newScore >= 85 ? 'CRITICAL' : newScore >= 60 ? 'HIGH' : 'INFO',
          actionUrl: '/dashboard/settings',
        }
      });
    }

    // 6. AUTO-CREATE SECURITY INCIDENT for HIGH/CRITICAL risk scores
    if (newScore >= 60 && oldScore < 60) {
      const incidentTitle = `High User Risk Score Threshold Violation — ${user.firstName} ${user.lastName}`;
      const incidentDesc = `User ${user.username} (${user.email}) risk score has reached ${newScore}/100 (${newLevel}). Trigger factor: ${reason}. System trust rating is at ${newTrustScore}%.`;
      
      const incident = await prisma.incident.create({
        data: {
          title: incidentTitle,
          description: incidentDesc,
          type: newScore >= 85 ? 'CRITICAL_RISK_BREACH' : 'HIGH_RISK_WARNING',
          severity: newScore >= 85 ? 'CRITICAL' : 'HIGH',
          status: 'OPEN',
          affectedUserId: userId,
          sourceIp: metadata?.ipAddress ?? null,
          attackVector: 'User Activity Anomaly',
          mitreTactic: 'Credential Access',
          mitreTechnique: 'T1078 — Valid Accounts',
          isSimulated: metadata?.isSimulated ?? false,
        }
      });

      // Log an Alert for this
      await prisma.alert.create({
        data: {
          incidentId: incident.id,
          type: 'HIGH_RISK_USER',
          severity: newScore >= 85 ? 'CRITICAL' : 'HIGH',
          title: incidentTitle,
          description: incidentDesc,
          userId,
          sourceIp: metadata?.ipAddress ?? null,
        }
      });

      log.warn(`Auto-generated security incident ${incident.id} for high-risk user ${user.username}`);
    }

    // 7. Emit WebSocket event to update all frontend dashboards in real-time!
    if (this.ioInstance) {
      this.ioInstance.emit('risk:update', {
        userId,
        username: user.username,
        score: newScore,
        level: newLevel,
        trustScore: newTrustScore,
        reason,
        historyEntry
      });
    }

    return updatedUser;
  }
}

export const riskService = new RiskService();
export default riskService;
