import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authLimiter, sensitiveActionLimiter } from '../../middleware/rate-limit.middleware.js';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
} from './auth.validation.js';

const router = Router();

// ─── Public routes ────────────────────────────────────────────
router.post('/login',
  authLimiter,
  validate(LoginSchema),
  authController.login,
);

router.post('/register',
  authLimiter,
  validate(RegisterSchema),
  authController.register,
);

router.post('/refresh',
  authLimiter,
  validate(RefreshTokenSchema),
  authController.refresh,
);

// ─── Protected routes ─────────────────────────────────────────
router.post('/logout',
  authenticate,
  authController.logout,
);

router.post('/logout-all',
  authenticate,
  authController.logoutAll,
);

router.get('/profile',
  authenticate,
  authController.getProfile,
);

router.put('/change-password',
  authenticate,
  sensitiveActionLimiter,
  validate(ChangePasswordSchema),
  authController.changePassword,
);

router.get('/sessions',
  authenticate,
  authController.getSessions,
);

export default router;
