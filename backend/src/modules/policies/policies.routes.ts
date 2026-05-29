import { Router } from 'express';
import { policiesController } from './policies.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All policy routes require authentication
router.use(authenticate);

// Get list of all security policies
router.get('/',
  requirePermission('read:policies'),
  policiesController.getPolicies
);

// Get details of specific policy
router.get('/:id',
  requirePermission('read:policies'),
  policiesController.getPolicyById
);

// Create new security policy
router.post('/',
  requirePermission('create:policies'),
  policiesController.createPolicy
);

// Update a specific security policy
router.put('/:id',
  requirePermission('update:policies'),
  policiesController.updatePolicy
);

// Toggle active/inactive state of a specific policy
router.put('/:id/toggle',
  requirePermission('update:policies'),
  policiesController.toggleActive
);

// Delete specific policy
router.delete('/:id',
  requirePermission('delete:policies'),
  policiesController.deletePolicy
);

export default router;
