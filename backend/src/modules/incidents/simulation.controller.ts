import type { Request, Response } from 'express';
import { riskService } from '../risk/risk.service.js';
import { auditService } from '../audit/audit.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { getClientIp } from '../../middleware/audit.middleware.js';
import { prisma } from '../../services/prisma.service.js';

export const simulationController = {
  simulateBruteForce: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body as { userId: string };
    if (!userId) throw new Error('Target User ID is required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const ipAddress = '185.220.101.42'; // Tor Exit Node
    const requesterIp = getClientIp(req);

    // 1. Evaluate user risk score spike
    await riskService.evaluateRisk(
      userId,
      `Simulated Brute Force Attack detected from Tor exit node (${ipAddress})`,
      35,
      {
        ipAddress,
        isSimulated: true,
        factors: [
          { id: 'brute_force', name: 'Brute Force Attempts', score: 35, weight: 1.2 }
        ]
      }
    );

    // 2. Record administrative audit log
    await auditService.recordLog({
      userId: req.user?.id ?? null,
      action: 'ATTACK_SIMULATION',
      resource: 'incidents',
      description: `Security simulation: Brute Force Attack launched against user ${user.username}`,
      ipAddress: requesterIp,
      severity: 'WARNING'
    });

    sendSuccess(res, null, `Simulated Brute Force Attack successfully executed against ${user.username}`);
  }),

  simulateImpossibleTravel: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body as { userId: string };
    if (!userId) throw new Error('Target User ID is required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const ipAddress = '91.148.128.45'; // Frankfurt, Germany
    const requesterIp = getClientIp(req);

    // 1. Evaluate user risk score spike (Impossible travel is high risk)
    await riskService.evaluateRisk(
      userId,
      `Simulated Impossible Travel detected (Tashkent -> Frankfurt in 33min) for user ${user.username}`,
      50,
      {
        ipAddress,
        isSimulated: true,
        factors: [
          { id: 'impossible_travel', name: 'Impossible Travel Anomaly', score: 50, weight: 1.5 }
        ]
      }
    );

    // 2. Record administrative audit log
    await auditService.recordLog({
      userId: req.user?.id ?? null,
      action: 'ATTACK_SIMULATION',
      resource: 'incidents',
      description: `Security simulation: Impossible Travel Attack launched against user ${user.username}`,
      ipAddress: requesterIp,
      severity: 'CRITICAL'
    });

    sendSuccess(res, null, `Simulated Impossible Travel successfully executed against ${user.username}`);
  }),

  simulateDataExfiltration: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body as { userId: string };
    if (!userId) throw new Error('Target User ID is required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const ipAddress = '45.33.32.156'; // Suspicious US IP
    const requesterIp = getClientIp(req);

    // 1. Evaluate user risk score spike
    await riskService.evaluateRisk(
      userId,
      `Simulated Data Exfiltration: 12.4 GB data upload to suspicious external IP (${ipAddress})`,
      40,
      {
        ipAddress,
        isSimulated: true,
        factors: [
          { id: 'data_exfiltration', name: 'Suspicious Bulk Data Transfer', score: 40, weight: 1.3 }
        ]
      }
    );

    // 2. Record administrative audit log
    await auditService.recordLog({
      userId: req.user?.id ?? null,
      action: 'ATTACK_SIMULATION',
      resource: 'incidents',
      description: `Security simulation: Data Exfiltration Attack launched against user ${user.username}`,
      ipAddress: requesterIp,
      severity: 'CRITICAL'
    });

    sendSuccess(res, null, `Simulated Data Exfiltration successfully executed against ${user.username}`);
  }),

  resetSimulations: asyncHandler(async (req: Request, res: Response) => {
    // Reset all simulated incidents and alerts, restore risk scores to 0
    await prisma.alert.deleteMany({ where: { title: { contains: '[SIM]' } } });
    
    const simIncidents = await prisma.incident.findMany({ where: { isSimulated: true } });
    const simIncidentIds = simIncidents.map((i) => i.id);

    await prisma.incidentUpdate.deleteMany({ where: { incidentId: { in: simIncidentIds } } });
    await prisma.incident.deleteMany({ where: { isSimulated: true } });

    // Reset user risk scores to 10 for simulated users
    await prisma.user.updateMany({
      data: {
        riskScore: 10,
        riskLevel: 'LOW',
        trustScore: 90
      }
    });

    await prisma.riskProfile.updateMany({
      data: {
        currentScore: 10,
        level: 'LOW',
        factors: '[]'
      }
    });

    const requesterIp = getClientIp(req);
    await auditService.recordLog({
      userId: req.user?.id ?? null,
      action: 'SYSTEM_RESET',
      resource: 'settings',
      description: 'Administrative reset: cleared all security simulation data and user risk ratings.',
      ipAddress: requesterIp,
      severity: 'WARNING'
    });

    sendSuccess(res, null, 'Simulation environment successfully reset. All simulation items cleared.');
  })
};
