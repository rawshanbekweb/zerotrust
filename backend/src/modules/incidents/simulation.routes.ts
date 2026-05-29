import { Router } from 'express';
import { simulationController } from './simulation.controller.js';
import { authenticate, requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// All simulation routes require authentication
router.use(authenticate);

// Simulate Brute Force Attack
router.post('/brute-force',
  requirePermission('update:incidents'),
  simulationController.simulateBruteForce
);

// Simulate Impossible Travel Anomaly
router.post('/impossible-travel',
  requirePermission('update:incidents'),
  simulationController.simulateImpossibleTravel
);

// Simulate Data Exfiltration Attack
router.post('/data-exfiltration',
  requirePermission('update:incidents'),
  simulationController.simulateDataExfiltration
);

// Reset simulation datasets
router.post('/reset',
  requirePermission('manage:settings'),
  simulationController.resetSimulations
);

export default router;
