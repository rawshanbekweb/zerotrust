import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.utils.js';
import { UnauthorizedError, ForbiddenError } from '../utils/api-response.js';
import { prisma } from '../services/prisma.service.js';
import type { RequestUser } from '../types/index.js';

// Extracts and verifies the Bearer token, then loads the user's permissions
// and attaches a RequestUser to req.user. Every protected route uses this.

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Verify the session is still active (covers force-logout scenarios)
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    // Load permissions for RBAC — attached once here, used in requirePermission
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account not found or deactivated');
    }

    const permissions = user.role.permissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.resource}`,
    );

    const requestUser: RequestUser = {
      id:          user.id,
      email:       user.email,
      role:        user.role.name,
      sessionId:   payload.sessionId,
      permissions,
    };

    req.user = requestUser;

    // Keep lastActivityAt fresh for session monitoring
    await prisma.session.update({
      where: { id: session.id },
      data:  { lastActivityAt: new Date() },
    });

    next();
  } catch (err) {
    next(err);
  }
}

// Factory: creates a middleware that checks for a specific permission.
// Usage: router.get('/users', authenticate, requirePermission('read:users'), handler)
export function requirePermission(permission: string) {
  return function (req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const hasPermission =
      req.user.role === 'SUPER_ADMIN' ||
      req.user.permissions.includes(permission) ||
      req.user.permissions.includes(`manage:${permission.split(':')[1]}`);

    if (!hasPermission) {
      next(new ForbiddenError(`Permission required: ${permission}`));
      return;
    }

    next();
  };
}

// Shorthand: checks the user's role directly (for coarse-grained guards)
export function requireRole(...roles: string[]) {
  return function (req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Role required: ${roles.join(' or ')}`));
      return;
    }

    next();
  };
}
