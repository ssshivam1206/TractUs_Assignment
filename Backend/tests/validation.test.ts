import { describe, expect, it } from 'vitest';
import {
  createConflictErrorResponse,
  createNotFoundErrorResponse,
  createSuccessResponse,
  createValidationErrorResponse,
} from '../src/common/api-response.js';
import {
  canTransitionContractStatus,
  getAllowedNextStatuses,
  isDraftContractStatus,
  isSameOrganisation,
} from '../src/modules/contracts/contracts.rules.js';
import {
  buildContractValidationErrorResponse,
  contractFieldDataSchema,
  getContractValidationDetails,
  validateContractFieldData,
} from '../src/modules/contracts/contracts.validation.js';
import {
  buildOrganisationValidationErrorResponse,
  getOrganisationValidationDetails,
  organisationPayloadSchema,
  validateOrganisationPayload,
} from '../src/modules/organisations/organisations.validation.js';

describe('shared api responses', () => {
  it('creates success responses', () => {
    expect(createSuccessResponse({ hello: 'world' })).toEqual({
      success: true,
      data: { hello: 'world' },
    });
  });

  it('creates validation responses', () => {
    expect(
      createValidationErrorResponse('Bad data', [{ path: 'payload', message: 'Invalid' }]),
    ).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad data',
        details: [{ path: 'payload', message: 'Invalid' }],
      },
    });
  });

  it('creates conflict responses', () => {
    expect(createConflictErrorResponse('Not allowed')).toEqual({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Not allowed',
        details: [],
      },
    });
  });

  it('creates not found responses', () => {
    expect(createNotFoundErrorResponse('Missing')).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Missing',
        details: [],
      },
    });
  });
});

describe('contract validation and rules', () => {
  it('accepts a valid contract payload', () => {
    const result = validateContractFieldData({
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      payment_terms: 'Net 30',
      delivery_terms: 'FOB Mumbai',
      items: [
        {
          description: 'Steel coils',
          quantity: 10,
          quantity_unit: 'MT',
          unit_price: 1500,
          pricing_unit: 'MT',
          total: 15000,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty items array', () => {
    const result = validateContractFieldData({
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      items: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('items must contain at least one item');
    }
  });

  it('rejects an invalid date format', () => {
    const result = validateContractFieldData({
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '05-07-2026',
      items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
    });

    expect(result.success).toBe(false);
  });

  it('formats validation errors for api responses', () => {
    const parsed = contractFieldDataSchema.safeParse({
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      items: [{ description: 'Steel coils', quantity: 0, unit_price: -1 }],
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(buildContractValidationErrorResponse(parsed.error)).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contract payload',
          details: [
            {
              path: 'items[0].quantity',
              message: 'Item quantity must be greater than 0',
            },
            {
              path: 'items[0].unit_price',
              message: 'Item unit_price must be greater than or equal to 0',
            },
          ],
        },
      });
    }
  });

  it('exposes validation details for contract payloads', () => {
    expect(
      getContractValidationDetails({
        client_name: '',
        po_ref_no: 'PO-1001',
        po_date: '2026-07-05',
        items: [{ description: 'Steel coils', quantity: 0, unit_price: -1 }],
      }),
    ).toEqual([
      { path: 'client_name', message: 'client_name is required' },
      { path: 'items[0].quantity', message: 'Item quantity must be greater than 0' },
      { path: 'items[0].unit_price', message: 'Item unit_price must be greater than or equal to 0' },
    ]);
  });

  it('enforces contract workflow rules', () => {
    expect(canTransitionContractStatus('DRAFT', 'FINALIZED')).toBe(true);
    expect(canTransitionContractStatus('FINALIZED', 'ARCHIVED')).toBe(true);
    expect(canTransitionContractStatus('DRAFT', 'ARCHIVED')).toBe(false);
    expect(canTransitionContractStatus('ARCHIVED', 'FINALIZED')).toBe(false);
    expect(getAllowedNextStatuses('DRAFT')).toEqual(['FINALIZED']);
    expect(getAllowedNextStatuses('FINALIZED')).toEqual(['ARCHIVED']);
    expect(getAllowedNextStatuses('ARCHIVED')).toEqual([]);
    expect(isDraftContractStatus('DRAFT')).toBe(true);
    expect(isDraftContractStatus('FINALIZED')).toBe(false);
    expect(isSameOrganisation('org-1', 'org-1')).toBe(true);
    expect(isSameOrganisation('org-1', 'org-2')).toBe(false);
  });
});

describe('organisation validation', () => {
  it('accepts valid organisation payloads', () => {
    const result = validateOrganisationPayload({ name: 'Demo Org' });
    expect(result.success).toBe(true);
  });

  it('rejects blank organisation names', () => {
    const invalid = organisationPayloadSchema.safeParse({ name: '   ' });
    expect(invalid.success).toBe(false);

    if (!invalid.success) {
      expect(buildOrganisationValidationErrorResponse(invalid.error)).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid organisation payload',
          details: [{ path: 'name', message: 'name is required' }],
        },
      });
    }
  });

  it('exposes validation details for organisation payloads', () => {
    expect(getOrganisationValidationDetails({ name: '' })).toEqual([
      { path: 'name', message: 'name is required' },
    ]);
  });
});
