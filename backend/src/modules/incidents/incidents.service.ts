import { prisma } from '../../services/prisma.service.js';
import { NotFoundError } from '../../utils/api-response.js';
import { parsePagination } from '../../utils/pagination.js';
import type { Request } from 'express';
import { log } from '../../utils/logger.js';
import type { Server as SocketServer } from 'socket.io';

export class IncidentsService {
  private ioInstance: SocketServer | null = null;

  setIo(io: SocketServer) {
    this.ioInstance = io;
  }

  async findAll(req: Request) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(req);
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;
    const isSimulated = req.query.isSimulated as string | undefined;

    const where: any = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (isSimulated !== undefined) where.isSimulated = isSimulated === 'true';

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, username: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.incident.count({ where }),
    ]);

    return { incidents, total, page, limit };
  }

  async findById(id: string) {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true, avatar: true, department: true }
        },
        createdBy: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true }
        },
        updates: {
          orderBy: { createdAt: 'asc' }
        },
        alerts: true
      }
    });

    if (!incident) throw new NotFoundError('Incident');
    return incident;
  }

  async assignIncident(id: string, assignedToId: string | null) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident');

    if (assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user) throw new NotFoundError('User');
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, username: true }
        }
      }
    });

    // Create automatic timeline comment for this assignment
    const assignText = assignedToId 
      ? `Incident assigned to ${updated.assignedTo?.firstName} ${updated.assignedTo?.lastName}`
      : 'Incident unassigned';

    await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        message: assignText,
        type: 'STATUS_CHANGE',
      }
    });

    // Broadcast WebSocket update
    if (this.ioInstance) {
      this.ioInstance.emit('incident:update', updated);
    }

    log.info(assignText, { incidentId: id });
    return updated;
  }

  async updateStatus(id: string, status: string, explanation: string, authorId?: string) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident');

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    // Add status change notification entry to the timeline
    await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        authorId: authorId ?? null,
        message: `Incident status updated to ${status}. Details: ${explanation}`,
        type: 'STATUS_CHANGE',
      }
    });

    // Broadcast WebSocket update
    if (this.ioInstance) {
      this.ioInstance.emit('incident:update', updated);
    }

    log.info(`Incident ${id} status updated to ${status}`, { incidentId: id });
    return updated;
  }

  async addComment(id: string, authorId: string, message: string, type = 'COMMENT') {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident');

    const comment = await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        authorId,
        message,
        type
      }
    });

    // Fetch author details for emitting
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, firstName: true, lastName: true, avatar: true }
    });

    // Broadcast WebSocket timeline update
    if (this.ioInstance) {
      this.ioInstance.emit('incident:comment', {
        incidentId: id,
        comment: {
          ...comment,
          author
        }
      });
    }

    return comment;
  }

  async create(data: {
    title: string;
    description: string;
    type: string;
    severity: string;
    affectedUserId?: string | null;
    affectedDeviceId?: string | null;
    sourceIp?: string | null;
    attackVector?: string | null;
    mitreTactic?: string | null;
    mitreTechnique?: string | null;
    isSimulated?: boolean;
    createdById?: string | null;
  }) {
    const incident = await prisma.incident.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity,
        status: 'OPEN',
        affectedUserId: data.affectedUserId ?? null,
        affectedDeviceId: data.affectedDeviceId ?? null,
        sourceIp: data.sourceIp ?? null,
        attackVector: data.attackVector ?? null,
        mitreTactic: data.mitreTactic ?? null,
        mitreTechnique: data.mitreTechnique ?? null,
        isSimulated: data.isSimulated ?? false,
        createdById: data.createdById ?? null,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Add first timeline update
    await prisma.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        message: 'Security incident registered by system detection engine.',
        type: 'STATUS_CHANGE',
      }
    });

    // Broadcast real-time websocket
    if (this.ioInstance) {
      this.ioInstance.emit('incident:new', incident);
    }

    return incident;
  }
}

export const incidentsService = new IncidentsService();
export default incidentsService;
