import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { createSuccessResponse } from '../src/common/api-response.js';
import { buildContractsRouter } from '../src/modules/contracts/contracts.routes.js';
import {
  ContractNotFoundError,
  ContractWorkflowError,
} from '../src/modules/contracts/contracts.service.js';
import { buildOrganisationsRouter } from '../src/modules/organisations/organisations.routes.js';

const contractPayload = {
  client_name: 'Acme Trading',
  po_ref_no: 'PO-1001',
  po_date: '2026-07-05',
  items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
};

const createdContract = {
  id: 'contract-1',
  organisation_id: 'org-1',
  client_name: 'Acme Trading',
  po_ref_no: 'PO-1001',
  po_date: '2026-07-05',
  status: 'DRAFT',
  field_data: contractPayload,
  created_at: '2026-07-05T00:00:00.000Z',
  updated_at: '2026-07-05T00:00:00.000Z',
  finalized_at: null,
  archived_at: null,
  deleted_at: null,
} as const;

const organisationPayload = {
  name: 'Demo Org',
};

const createdOrganisation = {
  id: 'org-1',
  name: 'Demo Org',
  created_at: '2026-07-05T00:00:00.000Z',
  updated_at: '2026-07-05T00:00:00.000Z',
} as const;

async function startTestApp() {
  const contractService = {
    createContract: vi.fn(async (organisationId: string) => ({
      ...createdContract,
      organisation_id: organisationId,
    })),
    listContracts: vi.fn(async () => [createdContract]),
    getContract: vi.fn(async () => createdContract),
    updateContract: vi.fn(async () => ({
      ...createdContract,
      client_name: 'Acme Trading Pvt Ltd',
    })),
    deleteContract: vi.fn(async () => ({
      ...createdContract,
      deleted_at: '2026-07-06T00:00:00.000Z',
    })),
  };

  const organisationService = {
    createOrganisation: vi.fn(async () => createdOrganisation),
    listOrganisations: vi.fn(async () => [createdOrganisation]),
  };

  const app = express();
  app.use(express.json());
  app.use('/contracts', buildContractsRouter(contractService));
  app.use('/organisations', buildOrganisationsRouter(organisationService));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error', details: [] },
    });
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    server,
    contractService,
    organisationService,
  };
}

async function request(baseUrl: string, path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

describe('phase 4 http routes', () => {
  let appContext: Awaited<ReturnType<typeof startTestApp>>;

  beforeEach(async () => {
    appContext = await startTestApp();
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      appContext.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('creates contracts with organisation scope', async () => {
    const response = await request(appContext.baseUrl, '/contracts', {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: JSON.stringify(contractPayload),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(createdContract));
    expect(appContext.contractService.createContract).toHaveBeenCalledWith('org-1', contractPayload);
  });

  it('rejects contracts without organisation scope', async () => {
    const response = await request(appContext.baseUrl, '/contracts', {
      method: 'POST',
      body: JSON.stringify(contractPayload),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Organisation scope is required',
        details: [{ path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' }],
      },
    });
  });

  it('lists contracts for an organisation', async () => {
    const response = await request(appContext.baseUrl, '/contracts', {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse([createdContract]));
    expect(appContext.contractService.listContracts).toHaveBeenCalledWith('org-1');
  });

  it('returns contract by id', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1', {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(createdContract));
    expect(appContext.contractService.getContract).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('returns 404 for missing contracts', async () => {
    appContext.contractService.getContract.mockRejectedValueOnce(new ContractNotFoundError());

    const response = await request(appContext.baseUrl, '/contracts/missing', {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Contract not found',
        details: [],
      },
    });
  });

  it('updates draft contracts', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1', {
      method: 'PATCH',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: JSON.stringify(contractPayload),
    });

    expect(response.status).toBe(200);
    expect(appContext.contractService.updateContract).toHaveBeenCalledWith('org-1', 'contract-1', contractPayload);
  });

  it('returns conflict for invalid contract transitions', async () => {
    appContext.contractService.updateContract.mockRejectedValueOnce(
      new ContractWorkflowError('Only draft contracts can be updated'),
    );

    const response = await request(appContext.baseUrl, '/contracts/contract-1', {
      method: 'PATCH',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: JSON.stringify(contractPayload),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Only draft contracts can be updated',
        details: [],
      },
    });
  });

  it('deletes draft contracts', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1', {
      method: 'DELETE',
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    expect(appContext.contractService.deleteContract).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('creates organisations', async () => {
    const response = await request(appContext.baseUrl, '/organisations', {
      method: 'POST',
      body: JSON.stringify(organisationPayload),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(createdOrganisation));
  });

  it('lists organisations', async () => {
    const response = await request(appContext.baseUrl, '/organisations');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse([createdOrganisation]));
  });
});
