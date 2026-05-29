import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Get core dashboard overview counters
router.get('/stats',
  requirePermission('read:analytics'),
  analyticsController.getStats
);

// Get complete analytical telemetry for charts
router.get('/telemetry',
  requirePermission('read:analytics'),
  analyticsController.getTelemetry
);

export default router;
