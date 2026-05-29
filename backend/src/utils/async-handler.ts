import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Eliminates the try/catch boilerplate from every async route handler.
// Without this wrapper, a thrown error inside an async handler would crash the
// process because Express 4 doesn't catch Promise rejections automatically.
// Express 5 fixes this, but we're on Express 4 for ecosystem stability.

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
