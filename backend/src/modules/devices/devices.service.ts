import { prisma } from '../../services/prisma.service.js';
import { NotFoundError } from '../../utils/api-response.js';
import { parsePagination } from '../../utils/pagination.js';
import type { Request } from 'express';
import { log } from '../../utils/logger.js';

export class DevicesService {
  async findAll(req: Request) {
    const { page, limit, skip, sortBy, sortOrder, search } = parsePagination(req);

    const where = search
      ? {
          OR: [
            { name:        { contains: search } },
            { os:          { contains: search } },
            { browser:     { contains: search } },
            { ipAddress:   { contains: search } },
            { user: {
                OR: [
                  { email:     { contains: search } },
                  { username:  { contains: search } },
                  { firstName: { contains: search } },
                  { lastName:  { contains: search } },
                ]
              }
            }
          ],
        }
      : {};

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              riskScore: true,
              riskLevel: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.device.count({ where }),
    ]);

    return { devices, total, page, limit };
  }

  async findById(id: string) {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            riskScore: true,
          }
        },
        sessions: {
          where: { isActive: true },
          orderBy: { lastActivityAt: 'desc' }
        }
      }
    });

    if (!device) throw new NotFoundError('Device');
    return device;
  }

  async findByUserId(userId: string) {
    return prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' }
    });
  }

  async updateTrust(id: string, trustScore: number, isTrusted: boolean) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundError('Device');

    const updated = await prisma.device.update({
      where: { id },
      data: {
        trustScore,
        isTrusted,
        ...(trustScore < 20 && { isBlocked: true, blockReason: 'Auto-blocked: Trust score below critical threshold (20)' })
      }
    });

    // If auto-blocked due to low score, revoke active sessions
    if (trustScore < 20) {
      await prisma.session.updateMany({
        where: { deviceId: id, isActive: true },
        data: {
          isActive: false,
          revokedReason: 'DEVICE_UNTRUSTED_LOW_SCORE',
          revokedAt: new Date()
        }
      });
      log.warn(`Device ${id} auto-blocked due to trust score ${trustScore}. Revoked sessions.`, { deviceId: id });
    }

    return updated;
  }

  async toggleBlock(id: string, isBlocked: boolean, blockReason?: string) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundError('Device');

    const updated = await prisma.device.update({
      where: { id },
      data: {
        isBlocked,
        blockReason: isBlocked ? (blockReason ?? 'Blocked by Administrator') : null,
        // If blocking, lower trust score to 10. If unblocking, restore to 50
        trustScore: isBlocked ? 10 : 50,
        isTrusted: isBlocked ? false : device.isTrusted
      }
    });

    if (isBlocked) {
      // FORCE REVOKE all active sessions for this device
      const revokeResult = await prisma.session.updateMany({
        where: { deviceId: id, isActive: true },
        data: {
          isActive: false,
          revokedReason: 'DEVICE_BLOCKED_BY_ADMIN',
          revokedAt: new Date()
        }
      });
      log.warn(`Device ${id} blocked by admin. Revoked ${revokeResult.count} active sessions.`, { deviceId: id });
    }

    return updated;
  }
}

export const devicesService = new DevicesService();
