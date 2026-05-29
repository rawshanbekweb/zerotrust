import { prisma } from '../../services/prisma.service.js';
import { parsePagination } from '../../utils/pagination.js';
import type { Request } from 'express';
import { log } from '../../utils/logger.js';

export class AuditService {
  async findAll(req: Request) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(req);
    const severity = req.query.severity as string | undefined;
    const action = req.query.action as string | undefined;
    const resource = req.query.resource as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (severity) where.severity = severity;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { action:      { contains: search } },
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
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, username: true, firstName: true, lastName: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async recordLog(data: {
    userId?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    description: string;
    ipAddress: string;
    userAgent?: string | null;
    severity?: string;
  }) {
    const entry = await prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent ?? null,
        severity: data.severity ?? 'INFO',
      }
    });

    log.debug(`Audit record created: [${entry.severity}] ${entry.action} - ${entry.description}`);
    return entry;
  }
}

export const auditService = new AuditService();
