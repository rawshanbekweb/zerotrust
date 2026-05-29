import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, ApiError } from '../types/index.js';

// Central place for all HTTP responses.
// Using these helpers means every endpoint returns the exact same JSON envelope —
// the frontend can rely on { success, data, timestamp } unconditionally.

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): void {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(message !== undefined && { message }),
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const totalPages = Math.ceil(total / limit);
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, string[]>,
): void {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}

// Typed application errors — thrown anywhere in the app,
// caught by the centralized error middleware
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, string[]> | undefined;

  constructor(
    message: string,
    code: string,
    statusCode = 400,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMITED', 429);
  }
}
