import type { Request, Response } from 'express';
import { devicesService } from './devices.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { log } from '../../utils/logger.js';

export const devicesController = {
  getDevices: asyncHandler(async (req: Request, res: Response) => {
    const { devices, total, page, limit } = await devicesService.findAll(req);
    sendPaginated(res, devices, total, page, limit);
  }),

  getDeviceById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new Error('Device ID is required');

    const device = await devicesService.findById(id);
    sendSuccess(res, device);
  }),

  updateTrust: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { trustScore, isTrusted } = req.body as { trustScore: number; isTrusted: boolean };

    if (!id) throw new Error('Device ID is required');
    if (typeof trustScore !== 'number') throw new Error('Valid trustScore is required');
    if (typeof isTrusted !== 'boolean') throw new Error('isTrusted is required');

    const updated = await devicesService.updateTrust(id, trustScore, isTrusted);
    log.info(`Device trust score updated`, { deviceId: id, trustScore, isTrusted });
    sendSuccess(res, updated, 'Device trust updated successfully');
  }),

  toggleBlock: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isBlocked, blockReason } = req.body as { isBlocked: boolean; blockReason?: string };

    if (!id) throw new Error('Device ID is required');
    if (typeof isBlocked !== 'boolean') throw new Error('isBlocked status is required');

    const updated = await devicesService.toggleBlock(id, isBlocked, blockReason);
    log.info(`Device block status toggled`, { deviceId: id, isBlocked, blockReason });
    sendSuccess(res, updated, isBlocked ? 'Device blocked successfully' : 'Device unblocked successfully');
  }),
};
