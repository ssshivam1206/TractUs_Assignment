import type { Request, Response } from 'express';
import { createConflictErrorResponse, createNotFoundErrorResponse, createValidationErrorResponse, type ApiErrorResponse } from './api-response.js';

export function sendErrorResponse(res: Response, statusCode: number, payload: ApiErrorResponse): Response {
  return res.status(statusCode).json(payload);
}

export function sendValidationErrorResponse(
  res: Response,
  message: string,
  details: Array<{ path: string; message: string }>,
): Response {
  return sendErrorResponse(res, 400, createValidationErrorResponse(message, details));
}

export function sendNotFoundResponse(res: Response, message: string): Response {
  return sendErrorResponse(res, 404, createNotFoundErrorResponse(message));
}

export function sendConflictResponse(res: Response, message: string): Response {
  return sendErrorResponse(res, 409, createConflictErrorResponse(message));
}

export function readOrganisationId(req: Request): string | null {
  const headerValue = req.header('x-organisation-id');

  if (!headerValue) {
    return null;
  }

  const trimmed = headerValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readRouteParam(req: Request, name: string): string | null {
  const value = req.params[name];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
