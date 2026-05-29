import { Router } from 'express';
import authRoutes  from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import devicesRoutes from '../modules/devices/devices.routes.js';
import incidentsRoutes from '../modules/incidents/incidents.routes.js';
import alertsRoutes from '../modules/alerts/alerts.routes.js';
import policiesRoutes from '../modules/policies/policies.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import simulationRoutes from '../modules/incidents/simulation.routes.js';
import { config } from '../config/index.js';

const router = Router();

const v = config.app.apiVersion;

// Health check — no auth, for load balancers and uptime monitors
router.get(`/api/${v}/health`, (_req: any, res) => {
  res.json({
    status:    'ok',
    version:   v,
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

// Feature modules
router.use(`/api/${v}/auth`,       authRoutes);
router.use(`/api/${v}/users`,      usersRoutes);
router.use(`/api/${v}/devices`,    devicesRoutes);
router.use(`/api/${v}/incidents`,  incidentsRoutes);
router.use(`/api/${v}/alerts`,     alertsRoutes);
router.use(`/api/${v}/policies`,   policiesRoutes);
router.use(`/api/${v}/audit`,      auditRoutes);
router.use(`/api/${v}/analytics`,  analyticsRoutes);
router.use(`/api/${v}/simulation`, simulationRoutes);

export default router;
