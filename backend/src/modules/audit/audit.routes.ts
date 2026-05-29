import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// Get list of all audit compliance logs
router.get('/',
  requirePermission('read:audit'),
  auditController.getLogs
);

export default router;
