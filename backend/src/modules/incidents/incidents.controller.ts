import type { Request, Response } from 'express';
import { incidentsService } from './incidents.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const incidentsController = {
  getIncidents: asyncHandler(async (req: Request, res: Response) => {
    const { incidents, total, page, limit } = await incidentsService.findAll(req);
    sendPaginated(res, incidents, total, page, limit);
  }),

  getIncidentById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new Error('Incident ID is required');

    const incident = await incidentsService.findById(id);
    sendSuccess(res, incident);
  }),

  assignIncident: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assignedToId } = req.body as { assignedToId: string | null };

    if (!id) throw new Error('Incident ID is required');

    const updated = await incidentsService.assignIncident(id, assignedToId);
    sendSuccess(res, updated, 'Incident assignment updated successfully');
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, explanation } = req.body as { status: string; explanation: string };
    const requesterId = req.user?.id;

    if (!id) throw new Error('Incident ID is required');
    if (!status) throw new Error('Incident status is required');
    if (!explanation) throw new Error('Explanation details are required');

    const updated = await incidentsService.updateStatus(id, status, explanation, requesterId);
    sendSuccess(res, updated, `Incident status updated to ${status}`);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { message } = req.body as { message: string };
    const requesterId = req.user?.id;

    if (!id) throw new Error('Incident ID is required');
    if (!message) throw new Error('Comment text is required');
    if (!requesterId) throw new Error('User context is missing');

    const comment = await incidentsService.addComment(id, requesterId, message);
    sendSuccess(res, comment, 'Comment added successfully');
  }),
};
