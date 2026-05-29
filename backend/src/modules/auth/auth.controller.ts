import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { getClientIp } from '../../middleware/audit.middleware.js';
import type { LoginInput, RegisterInput, RefreshTokenInput, ChangePasswordInput } from './auth.validation.js';

// Controllers are thin: validate input shape (Zod middleware already ran),
// call the service, format the response. No business logic here.

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const input     = req.body as LoginInput;
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? 'Unknown';

    const result = await authService.login(input, ipAddress, userAgent);

    sendSuccess(res, result, 'Login successful');
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RegisterInput;
    const user  = await authService.register(input);

    sendSuccess(res, user, 'Account created successfully', 201);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshTokenInput;
    const tokens = await authService.refreshTokens(refreshToken);

    sendSuccess(res, tokens, 'Tokens refreshed');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await authService.logout(sessionId);
    }
    sendSuccess(res, null, 'Logged out successfully');
  }),

  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (userId) {
      await authService.logoutAll(userId);
    }
    sendSuccess(res, null, 'All sessions terminated');
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const user = await authService.getProfile(userId);
    sendSuccess(res, user);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const input = req.body as ChangePasswordInput;
    await authService.changePassword(userId, input);

    sendSuccess(res, null, 'Password changed successfully');
  }),

  getSessions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const sessions = await authService.getSessions(userId);
    sendSuccess(res, sessions);
  }),
};
