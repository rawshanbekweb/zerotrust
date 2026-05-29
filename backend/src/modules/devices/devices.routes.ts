import { Router } from 'express';
import { devicesController } from './devices.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All device routes require authentication
router.use(authenticate);

// Get list of all devices
router.get('/',
  requirePermission('read:devices'),
  devicesController.getDevices
);

// Get detail of a specific device
router.get('/:id',
  requirePermission('read:devices'),
  devicesController.getDeviceById
);

// Update trust rating of a specific device
router.put('/:id/trust',
  requirePermission('update:devices'),
  devicesController.updateTrust
);

// Block or unblock a specific device
router.put('/:id/block',
  requirePermission('update:devices'),
  devicesController.toggleBlock
);

export default router;
