import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';

export type ApiClientOptions = {
  baseUrl?: string;
  organisationId?: string;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  organisationId?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly payload?: ApiErrorResponse;

  constructor(message: string, status: number, payload?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

function getDefaultBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8001';
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? getDefaultBaseUrl();

  async function request<T>(
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const response = await fetch(new URL(path, baseUrl), {
      method: requestOptions.method ?? 'GET',
      headers: buildHeaders({
        organizationId: requestOptions.organisationId ?? options.organisationId,
        headers: requestOptions.headers,
        hasBody: requestOptions.body !== undefined,
      }),
      body:
        requestOptions.body === undefined
          ? undefined
          : JSON.stringify(requestOptions.body),
      signal: requestOptions.signal,
    });

    const text = await response.text();
    const parsed = parseJson(text);

    if (!response.ok) {
      throw new ApiRequestError(
        getErrorMessage(parsed, response.status),
        response.status,
        isApiErrorResponse(parsed) ? parsed : undefined,
      );
    }

    if (!isApiSuccessResponse<T>(parsed)) {
      throw new ApiRequestError(
        'Unexpected response format from API',
        response.status,
      );
    }

    return parsed.data;
  }

  return { request };
}

function buildHeaders({
  organizationId,
  headers,
  hasBody,
}: {
  organizationId?: string;
  headers?: HeadersInit;
  hasBody: boolean;
}): Headers {
  const nextHeaders = new Headers(headers);

  if (hasBody && !nextHeaders.has('content-type')) {
    nextHeaders.set('content-type', 'application/json');
  }

  if (organizationId && !nextHeaders.has('x-organisation-id')) {
    nextHeaders.set('x-organisation-id', organizationId);
  }

  return nextHeaders;
}

function parseJson(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isApiSuccessResponse<T>(
  value: unknown,
): value is ApiSuccessResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success?: unknown }).success === true &&
    'data' in value
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success?: unknown }).success === false &&
    'error' in value
  );
}

function getErrorMessage(parsed: unknown, status: number): string {
  if (isApiErrorResponse(parsed)) {
    return parsed.error.message;
  }

  return `Request failed with status ${status}`;
}
