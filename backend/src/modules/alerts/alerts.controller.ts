import type { Request, Response } from 'express';
import { alertsService } from './alerts.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const alertsController = {
  getAlerts: asyncHandler(async (req: Request, res: Response) => {
    const { alerts, total, page, limit } = await alertsService.findAll(req);
    sendPaginated(res, alerts, total, page, limit);
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new Error('Alert ID is required');

    const updated = await alertsService.markAsRead(id);
    sendSuccess(res, updated, 'Alert marked as read');
  }),

  markAllAsRead: asyncHandler(async (_req: Request, res: Response) => {
    await alertsService.markAllAsRead();
    sendSuccess(res, null, 'All alerts marked as read');
  }),
};
