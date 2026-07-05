import { z } from 'zod';
import { createValidationErrorResponse, type ApiErrorDetail, type ApiErrorResponse } from '../../common/api-response.js';

export const organisationPayloadSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
});

export type OrganisationPayload = z.infer<typeof organisationPayloadSchema>;

export function validateOrganisationPayload(input: unknown) {
  return organisationPayloadSchema.safeParse(input);
}

export function buildOrganisationValidationErrorResponse(error: z.ZodError): ApiErrorResponse {
  const details = error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));

  return createValidationErrorResponse('Invalid organisation payload', details);
}

export function getOrganisationValidationDetails(input: unknown): ApiErrorDetail[] {
  const result = validateOrganisationPayload(input);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
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
