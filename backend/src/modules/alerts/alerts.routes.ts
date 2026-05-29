import { Router } from 'express';
import { alertsController } from './alerts.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All alert routes require authentication
router.use(authenticate);

// Get list of all security alerts
router.get('/',
  requirePermission('read:alerts'),
  alertsController.getAlerts
);

// Bulk mark all alerts as read
router.put('/read-all',
  requirePermission('update:alerts'),
  alertsController.markAllAsRead
);

// Mark specific alert as read
router.put('/:id/read',
  requirePermission('update:alerts'),
  alertsController.markAsRead
);

export default router;
