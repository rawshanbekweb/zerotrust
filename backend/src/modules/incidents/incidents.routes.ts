import { Router } from 'express';
import { incidentsController } from './incidents.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All incident routes require authentication
router.use(authenticate);

// Get list of all incidents
router.get('/',
  requirePermission('read:incidents'),
  incidentsController.getIncidents
);

// Get detail of a specific incident
router.get('/:id',
  requirePermission('read:incidents'),
  incidentsController.getIncidentById
);

// Assign incident to an analyst
router.put('/:id/assign',
  requirePermission('update:incidents'),
  incidentsController.assignIncident
);

// Update incident status
router.put('/:id/status',
  requirePermission('update:incidents'),
  incidentsController.updateStatus
);

// Add analyst comment to incident timeline
router.post('/:id/comments',
  requirePermission('update:incidents'),
  incidentsController.addComment
);

export default router;
