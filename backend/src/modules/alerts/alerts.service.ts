import { prisma } from '../../services/prisma.service.js';
import { NotFoundError } from '../../utils/api-response.js';
import { parsePagination } from '../../utils/pagination.js';
import type { Request } from 'express';
import { log } from '../../utils/logger.js';
import type { Server as SocketServer } from 'socket.io';

export class AlertsService {
  private ioInstance: SocketServer | null = null;

  setIo(io: SocketServer) {
    this.ioInstance = io;
  }

  async findAll(req: Request) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(req);
    const severity = req.query.severity as string | undefined;
    const isRead = req.query.isRead as string | undefined;

    const where: any = {};
    if (severity) where.severity = severity;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    return { alerts, total, page, limit };
  }

  async markAsRead(id: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert');

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        isRead: true,
        resolvedAt: new Date()
      }
    });

    log.info(`Alert marked as read`, { alertId: id });
    return updated;
  }

  async markAllAsRead() {
    const result = await prisma.alert.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        resolvedAt: new Date()
      }
    });

    log.info(`All alerts marked as read`, { count: result.count });
    return result;
  }

  async create(data: {
    type: string;
    severity: string;
    title: string;
    description: string;
    userId?: string | null;
    deviceId?: string | null;
    sourceIp?: string | null;
    metadata?: Record<string, any>;
    incidentId?: string | null;
  }) {
    const alert = await prisma.alert.create({
      data: {
        type: data.type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        userId: data.userId ?? null,
        deviceId: data.deviceId ?? null,
        sourceIp: data.sourceIp ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        incidentId: data.incidentId ?? null,
      }
    });

    // Broadcast to real-time clients!
    if (this.ioInstance) {
      this.ioInstance.emit('alert:new', alert);
    }

    return alert;
  }
}

export const alertsService = new AlertsService();
