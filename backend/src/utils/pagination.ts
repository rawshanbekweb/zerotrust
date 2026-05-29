import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string | undefined;
}

export function parsePagination(
  req: Request,
  defaultSortBy = 'createdAt',
): PaginationParams {
  const page      = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const limit     = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
  const sortBy    = typeof req.query['sortBy'] === 'string' ? req.query['sortBy'] : defaultSortBy;
  const rawOrder  = req.query['sortOrder'];
  const sortOrder = rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : 'desc';
  const search    = typeof req.query['search'] === 'string' && req.query['search'].length > 0
    ? req.query['search']
    : undefined;

  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder, search };
}
