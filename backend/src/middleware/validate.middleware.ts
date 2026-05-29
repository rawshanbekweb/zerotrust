import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/api-response.js';

type RequestPart = 'body' | 'query' | 'params';

// Factory that returns a validation middleware for any Zod schema.
// Validates the specified part of the request and replaces it with
// the parsed (and coerced) value — downstream handlers get clean typed data.
//
// Usage: router.post('/login', validate(LoginSchema), controller.login)

export function validate(schema: ZodSchema, part: RequestPart = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = buildDetails(result.error);
      next(new ValidationError('Validation failed', details));
      return;
    }

    // Replace with the parsed/coerced value (e.g., query strings coerced to numbers)
    (req as any)[part] = result.data;
    next();
  };
}

function buildDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'root';
    details[key] ??= [];
    details[key].push(issue.message);
  }
  return details;
}
