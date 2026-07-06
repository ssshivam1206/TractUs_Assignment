import type { ApiErrorDetail, ApiErrorResponse } from '@/types/api';
import { ApiRequestError } from './http';

export type NormalizedApiError = {
  kind: 'validation' | 'not_found' | 'conflict' | 'network' | 'unknown';
  message: string;
  status?: number;
  details: ApiErrorDetail[];
};

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof ApiRequestError) {
    if (error.payload) {
      return mapApiErrorResponse(error.payload, error.status);
    }

    if (error.status === 0) {
      return {
        kind: 'network',
        message: error.message,
        status: error.status,
        details: [],
      };
    }

    return {
      kind: 'unknown',
      message: error.message,
      status: error.status,
      details: [],
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'network',
      message: error.message,
      details: [],
    };
  }

  return {
    kind: 'unknown',
    message: 'Unexpected error',
    details: [],
  };
}

function mapApiErrorResponse(payload: ApiErrorResponse, status: number): NormalizedApiError {
  switch (payload.error.code) {
    case 'VALIDATION_ERROR':
      return {
        kind: 'validation',
        message: payload.error.message,
        status,
        details: payload.error.details,
      };
    case 'NOT_FOUND':
      return {
        kind: 'not_found',
        message: payload.error.message,
        status,
        details: payload.error.details,
      };
    case 'CONFLICT':
      return {
        kind: 'conflict',
        message: payload.error.message,
        status,
        details: payload.error.details,
      };
    default:
      return {
        kind: 'unknown',
        message: payload.error.message,
        status,
        details: payload.error.details,
      };
  }
}
