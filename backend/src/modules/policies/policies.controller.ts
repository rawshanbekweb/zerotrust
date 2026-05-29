import type { Request, Response } from 'express';
import { policiesService } from './policies.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { getClientIp } from '../../middleware/audit.middleware.js';

export const policiesController = {
  getPolicies: asyncHandler(async (_req: Request, res: Response) => {
    const policies = await policiesService.findAll();
    sendSuccess(res, policies);
  }),

  getPolicyById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new Error('Policy ID is required');

    const policy = await policiesService.findById(id);
    sendSuccess(res, policy);
  }),

  createPolicy: asyncHandler(async (req: Request, res: Response) => {
    const requesterUserId = req.user?.id;
    if (!requesterUserId) throw new Error('User context required');

    const ipAddress = getClientIp(req);
    const policy = await policiesService.create(req.body, requesterUserId, ipAddress);

    sendSuccess(res, policy, 'Policy created successfully', 201);
  }),

  updatePolicy: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requesterUserId = req.user?.id;

    if (!id) throw new Error('Policy ID is required');
    if (!requesterUserId) throw new Error('User context required');

    const ipAddress = getClientIp(req);
    const updated = await policiesService.update(id, req.body, requesterUserId, ipAddress);

    sendSuccess(res, updated, 'Policy updated successfully');
  }),

  toggleActive: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body as { isActive: boolean };
    const requesterUserId = req.user?.id;

    if (!id) throw new Error('Policy ID is required');
    if (typeof isActive !== 'boolean') throw new Error('isActive status is required');
    if (!requesterUserId) throw new Error('User context required');

    const ipAddress = getClientIp(req);
    const updated = await policiesService.toggleActive(id, isActive, requesterUserId, ipAddress);

    sendSuccess(res, updated, isActive ? 'Policy activated' : 'Policy deactivated');
  }),

  deletePolicy: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requesterUserId = req.user?.id;

    if (!id) throw new Error('Policy ID is required');
    if (!requesterUserId) throw new Error('User context required');

    const ipAddress = getClientIp(req);
    await policiesService.delete(id, requesterUserId, ipAddress);

    sendSuccess(res, null, 'Policy permanently deleted');
  }),
};
