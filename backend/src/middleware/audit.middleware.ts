import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { log } from '../utils/logger.js';

// Auto-generates an audit log entry after mutating requests (POST/PUT/PATCH/DELETE).
// Routes opt in by attaching audit metadata to res.locals before the handler runs.
// This keeps audit logic OUT of business services — they shouldn't know about logging.

export interface AuditMeta {
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

// Attach this to res.locals before the handler to trigger an audit log on success
export function auditLog(meta: AuditMeta) {
  return function (_req: Request, res: Response, next: NextFunction): void {
    res.locals['auditMeta'] = meta;
    next();
  };
}

// Response interceptor — fires after the route handler sends a response
export function auditInterceptor(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    const meta = res.locals['auditMeta'] as AuditMeta | undefined;

    if (meta && res.statusCode < 400) {
      const userId    = req.user?.id;
      const ipAddress = getClientIp(req);

      prisma.auditLog
        .create({
          data: {
            userId:      userId ?? null,
            action:      meta.action,
            resource:    meta.resource,
            resourceId:  meta.resourceId ?? null,
            description: meta.description,
            ipAddress,
            userAgent:   req.headers['user-agent'] ?? '',
            severity:    meta.severity ?? 'INFO',
          },
        })
        .catch((err: unknown) => log.error('Audit log write failed', { err }));
    }

    return originalJson(body);
  };

  next();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
  }
  return req.ip ?? '0.0.0.0';
}
