import type { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { UpdateUserDto } from '../../types/index.js';

export const usersController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { users, total, page, limit } = await usersService.findAll(req);
    sendPaginated(res, users, total, page, limit);
  }),

  findById: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.findById(req.params['id'] ?? '');
    sendSuccess(res, user);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.update(req.params['id'] ?? '', req.body as UpdateUserDto);
    sendSuccess(res, user, 'User updated');
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    const requesterId = req.user?.id ?? '';
    await usersService.deactivate(req.params['id'] ?? '', requesterId);
    sendSuccess(res, null, 'User deactivated');
  }),

  getRiskProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await usersService.getRiskProfile(req.params['id'] ?? '');
    sendSuccess(res, data);
  }),

  getLoginHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await usersService.getLoginHistory(req.params['id'] ?? '');
    sendSuccess(res, data);
  }),

  getRoles: asyncHandler(async (_req: Request, res: Response) => {
    const roles = await usersService.getRoles();
    sendSuccess(res, roles);
  }),

  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await usersService.getStats();
    sendSuccess(res, stats);
  }),
};
