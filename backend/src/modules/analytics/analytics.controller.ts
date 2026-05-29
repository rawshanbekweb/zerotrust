import type { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const analyticsController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await analyticsService.getDashboardStats();
    sendSuccess(res, stats);
  }),

  getTelemetry: asyncHandler(async (_req: Request, res: Response) => {
    const telemetry = await analyticsService.getTelemetry();
    sendSuccess(res, telemetry);
  }),
};
