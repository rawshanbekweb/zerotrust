import type { Request, Response } from 'express';
import { auditService } from './audit.service.js';
import { sendPaginated } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const auditController = {
  getLogs: asyncHandler(async (req: Request, res: Response) => {
    const { logs, total, page, limit } = await auditService.findAll(req);
    sendPaginated(res, logs, total, page, limit);
  }),
};
