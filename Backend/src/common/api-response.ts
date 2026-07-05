export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT';

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details: ApiErrorDetail[];
  };
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details: ApiErrorDetail[] = [],
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createValidationErrorResponse(
  message: string,
  details: ApiErrorDetail[],
): ApiErrorResponse {
  return createErrorResponse('VALIDATION_ERROR', message, details);
}

export function createConflictErrorResponse(
  message: string,
  details: ApiErrorDetail[] = [],
): ApiErrorResponse {
  return createErrorResponse('CONFLICT', message, details);
}

export function createNotFoundErrorResponse(
  message: string,
  details: ApiErrorDetail[] = [],
): ApiErrorResponse {
  return createErrorResponse('NOT_FOUND', message, details);
}
