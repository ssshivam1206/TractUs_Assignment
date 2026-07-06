import { z } from 'zod';
import { createValidationErrorResponse, type ApiErrorDetail, type ApiErrorResponse } from '../../common/api-response.js';
import { CONTRACT_STATUSES, type ContractStatus } from './contracts.rules.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTRACT_LIST_LIMIT = 50;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

const contractItemSchema = z
  .object({
    description: z.string().trim().min(1, 'Item description is required'),
    quantity: z.number().positive('Item quantity must be greater than 0'),
    quantity_unit: z.string().trim().min(1).optional(),
    unit_price: z.number().min(0, 'Item unit_price must be greater than or equal to 0'),
    pricing_unit: z.string().trim().min(1).optional(),
    total: z.number().min(0, 'Item total must be greater than or equal to 0').optional(),
  })
  .passthrough();

export const contractFieldDataSchema = z
  .object({
    client_name: z.string().trim().min(1, 'client_name is required'),
    po_ref_no: z.string().trim().min(1, 'po_ref_no is required'),
    po_date: z
      .string()
      .trim()
      .refine(isValidIsoDate, 'po_date must be a valid YYYY-MM-DD date'),
    payment_terms: z.string().trim().min(1).optional(),
    delivery_terms: z.string().trim().min(1).optional(),
    items: z.array(contractItemSchema).min(1, 'items must contain at least one item'),
  })
  .passthrough();

export const contractUpdateFieldDataSchema = contractFieldDataSchema
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
        path: ['payload'],
      });
    }
  });

export type ContractFieldData = z.infer<typeof contractFieldDataSchema>;
export type ContractUpdateFieldData = z.infer<typeof contractUpdateFieldDataSchema>;
export type ContractListQuery = {
  status?: ContractStatus;
  clientName?: string;
  contractId?: string;
  page: number;
  limit: number;
  offset: number;
};

type PaginationNormalizationResult =
  | {
      success: true;
      data: {
        page: number;
        limit: number;
        offset: number;
      };
    }
  | {
      success: false;
      details: ApiErrorDetail[];
    };

type ContractListQueryResult =
  | {
      success: true;
      data: ContractListQuery;
    }
  | {
      success: false;
      error: ApiErrorResponse;
    };

export function validateContractFieldData(input: unknown) {
  return contractFieldDataSchema.safeParse(input);
}

export function parseContractFieldData(input: unknown): ContractFieldData {
  return contractFieldDataSchema.parse(input);
}

export function validateContractUpdateFieldData(input: unknown) {
  return contractUpdateFieldDataSchema.safeParse(input);
}

export function parseContractUpdateFieldData(input: unknown): ContractUpdateFieldData {
  return contractUpdateFieldDataSchema.parse(input);
}

export function buildContractValidationErrorResponse(
  error: z.ZodError,
  message = 'Invalid contract payload',
): ApiErrorResponse {
  const details = error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));

  return createValidationErrorResponse(message, details);
}

export function normalizePagination(
  pageInput: unknown,
  limitInput: unknown,
): PaginationNormalizationResult {
  const details: ApiErrorDetail[] = [];
  const page = parsePositiveInteger(pageInput, 1, 'page', details);
  const rawLimit = parsePositiveInteger(limitInput, 10, 'limit', details);
  const limit = rawLimit > MAX_CONTRACT_LIST_LIMIT ? MAX_CONTRACT_LIST_LIMIT : rawLimit;

  if (details.length > 0) {
    return {
      success: false,
      details,
    };
  }

  return {
    success: true,
    data: {
      page,
      limit,
      offset: (page - 1) * limit,
    },
  };
}

export function parseContractListQuery(input: unknown): ContractListQueryResult {
  if (!isPlainObject(input)) {
    return {
      success: false,
      error: createValidationErrorResponse('Invalid contract list query', [
        { path: 'query', message: 'query must be an object' },
      ]),
    };
  }

  const query = input as Record<string, unknown>;
  const details: ApiErrorDetail[] = [];
  const status = parseContractStatus(query.status, details);
  const clientName = parseOptionalString(query.client_name, 'client_name', details);
  const contractId = parseOptionalString(query.contract_id, 'contract_id', details);
  const pagination = normalizePagination(query.page, query.limit);

  if (!pagination.success) {
    details.push(...pagination.details);
  }

  if (details.length > 0) {
    return {
      success: false,
      error: createValidationErrorResponse('Invalid contract list query', details),
    };
  }

  const paginationData = pagination.success ? pagination.data : null;
  if (!paginationData) {
    return {
      success: false,
      error: createValidationErrorResponse('Invalid contract list query', details),
    };
  }

  return {
    success: true,
    data: {
      status,
      clientName,
      contractId,
      page: paginationData.page,
      limit: paginationData.limit,
      offset: paginationData.offset,
    },
  };
}

function parseContractStatus(value: unknown, details: ApiErrorDetail[]): ContractStatus | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    details.push({
      path: 'status',
      message: 'status must be one of DRAFT, FINALIZED, ARCHIVED',
    });
    return undefined;
  }

  if (typeof value !== 'string') {
    details.push({
      path: 'status',
      message: 'status must be one of DRAFT, FINALIZED, ARCHIVED',
    });
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || !CONTRACT_STATUSES.includes(trimmed as ContractStatus)) {
    details.push({
      path: 'status',
      message: 'status must be one of DRAFT, FINALIZED, ARCHIVED',
    });
    return undefined;
  }

  return trimmed as ContractStatus;
}

function parseOptionalString(
  value: unknown,
  fieldName: 'client_name' | 'contract_id',
  details: ApiErrorDetail[],
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    details.push({
      path: fieldName,
      message: `${fieldName} must be a string`,
    });
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    details.push({
      path: fieldName,
      message: `${fieldName} cannot be empty`,
    });
    return undefined;
  }

  return trimmed;
}

function parsePositiveInteger(
  value: unknown,
  defaultValue: number,
  fieldName: 'page' | 'limit',
  details: ApiErrorDetail[],
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value)) {
    details.push({
      path: fieldName,
      message: `${fieldName} must be a positive integer`,
    });
    return defaultValue;
  }

  const parsedValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    details.push({
      path: fieldName,
      message: `${fieldName} must be a positive integer`,
    });
    return defaultValue;
  }

  return parsedValue;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return 'payload';
  }

  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === 'number') {
      return `${formatted}[${segment}]`;
    }

    const value = String(segment);
    return formatted ? `${formatted}.${value}` : value;
  }, '');
}

export function getContractValidationDetails(input: unknown): ApiErrorDetail[] {
  const result = validateContractFieldData(input);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
}
