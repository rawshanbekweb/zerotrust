import type { RequestUser } from './index.js';

// Augment the Express Request type so req.user is typed everywhere.
// Without this every route handler would need a cast — defeats strict TypeScript.
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      sessionId?: string;
    }
  }
}

export {};
