import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, sendError } from '../utils/api-response.js';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

// Central error handler — Express calls this when next(err) is invoked
// or when an async handler throws. Must have 4 parameters to be recognized
// by Express as an error handler.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ─── Zod validation errors ─────────────────────────────────
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      details[key] ??= [];
      details[key].push(issue.message);
    }
    sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 422, details);
    return;
  }

  // ─── Known application errors ──────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error(err.message, { stack: err.stack, path: req.path });
    }
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // ─── Unknown / unexpected errors ───────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  const stack   = err instanceof Error ? err.stack : undefined;

  log.error('Unhandled error', { message, stack, path: req.path, method: req.method });

  // Never leak stack traces in production
  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    config.app.isDevelopment ? message : 'Internal server error',
    500,
  );
}

// 404 handler — mounted after all routes
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
}
