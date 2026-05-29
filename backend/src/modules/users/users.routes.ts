import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticate, requirePermission, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All users routes require authentication
router.use(authenticate);

router.get('/',
  requirePermission('read:users'),
  usersController.findAll,
);

router.get('/stats',
  requirePermission('read:users'),
  usersController.getStats,
);

router.get('/roles',
  requirePermission('read:roles'),
  usersController.getRoles,
);

router.get('/:id',
  requirePermission('read:users'),
  usersController.findById,
);

router.put('/:id',
  requirePermission('update:users'),
  usersController.update,
);

router.post('/:id/deactivate',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  usersController.deactivate,
);

router.get('/:id/risk-profile',
  requirePermission('read:users'),
  usersController.getRiskProfile,
);

router.get('/:id/login-history',
  requirePermission('read:audit'),
  usersController.getLoginHistory,
);

export default router;
