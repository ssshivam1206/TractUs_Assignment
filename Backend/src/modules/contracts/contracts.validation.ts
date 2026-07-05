import { z } from 'zod';
import { createValidationErrorResponse, type ApiErrorDetail, type ApiErrorResponse } from '../../common/api-response.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export type ContractFieldData = z.infer<typeof contractFieldDataSchema>;

export function validateContractFieldData(input: unknown) {
  return contractFieldDataSchema.safeParse(input);
}

export function parseContractFieldData(input: unknown): ContractFieldData {
  return contractFieldDataSchema.parse(input);
}

export function buildContractValidationErrorResponse(
  error: z.ZodError,
): ApiErrorResponse {
  const details = error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));

  return createValidationErrorResponse('Invalid contract payload', details);
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
