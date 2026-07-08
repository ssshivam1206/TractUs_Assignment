import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, request as httpRequest } from 'node:http';
import { AddressInfo } from 'node:net';
import { createSuccessResponse } from '../src/common/api-response.js';
import { buildContractsRouter } from '../src/modules/contracts/contracts.routes.js';
import {
  ContractNotFoundError,
  ContractWorkflowError,
} from '../src/modules/contracts/contracts.service.js';
import { buildOrganisationsRouter } from '../src/modules/organisations/organisations.routes.js';
import { buildRealtimeRouter } from '../src/modules/realtime/realtime.routes.js';

const contractPayload = {
  client_name: 'Acme Trading',
  po_ref_no: 'PO-1001',
  po_date: '2026-07-05',
  items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
};

const partialContractUpdatePayload = {
  client_name: 'Acme Trading Pvt Ltd',
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

const finalizedContract = {
  ...createdContract,
  status: 'FINALIZED',
  finalized_at: '2026-07-06T00:00:00.000Z',
} as const;

const archivedContract = {
  ...createdContract,
  status: 'ARCHIVED',
  finalized_at: '2026-07-06T00:00:00.000Z',
  archived_at: '2026-07-07T00:00:00.000Z',
} as const;

const listContractsResponse = {
  items: [createdContract],
  page: 2,
  limit: 50,
  total: 3,
  total_pages: 1,
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
    listContracts: vi.fn(async () => listContractsResponse),
    getContract: vi.fn(async () => createdContract),
    listContractEvents: vi.fn(async () => [
      {
        id: 'event-1',
        contract_id: 'contract-1',
        organisation_id: 'org-1',
        event_type: 'CREATE',
        before_state: null,
        after_state: createdContract,
        created_at: '2026-07-05T00:00:00.000Z',
      },
    ]),
    updateContract: vi.fn(async () => ({
      ...createdContract,
      client_name: 'Acme Trading Pvt Ltd',
    })),
    finalizeContract: vi.fn(async () => finalizedContract),
    archiveContract: vi.fn(async () => archivedContract),
    deleteContract: vi.fn(async () => ({
      ...createdContract,
      deleted_at: '2026-07-06T00:00:00.000Z',
    })),
  };

  const organisationService = {
    createOrganisation: vi.fn(async () => createdOrganisation),
    listOrganisations: vi.fn(async () => [createdOrganisation]),
  };

  const realtimeBroadcaster = {
    subscribe: vi.fn((response) => {
      response.status(200);
      response.setHeader('content-type', 'text/event-stream; charset=utf-8');
      response.write(': ok\n\n');
      response.end();
    }),
  };

  const app = express();
  app.use(express.json());
  app.use('/contracts', buildContractsRouter(contractService));
  app.use('/organisations', buildOrganisationsRouter(organisationService));
  app.use('/events', buildRealtimeRouter(realtimeBroadcaster));
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
    realtimeBroadcaster,
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

describe('phase 4, 5, 6, and 7 http routes', () => {
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

  it('lists contracts with parsed search and pagination filters', async () => {
    const response = await request(
      appContext.baseUrl,
      '/contracts?status=DRAFT&client_name=acme&contract_id=contract-1&page=2&limit=99',
      {
        headers: {
          'x-organisation-id': 'org-1',
        },
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(listContractsResponse));
    expect(appContext.contractService.listContracts).toHaveBeenCalledWith('org-1', {
      status: 'DRAFT',
      clientName: 'acme',
      contractId: 'contract-1',
      page: 2,
      limit: 50,
      offset: 50,
    });
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

  it('returns contract event history by id', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1/events', {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      createSuccessResponse([
        {
          id: 'event-1',
          contract_id: 'contract-1',
          organisation_id: 'org-1',
          event_type: 'CREATE',
          before_state: null,
          after_state: createdContract,
          created_at: '2026-07-05T00:00:00.000Z',
        },
      ]),
    );
    expect(appContext.contractService.listContractEvents).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('rejects missing contract events with 404', async () => {
    appContext.contractService.listContractEvents.mockRejectedValueOnce(new ContractNotFoundError());

    const response = await request(appContext.baseUrl, '/contracts/missing/events', {
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

  it('updates draft contracts with a partial patch body', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1', {
      method: 'PATCH',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: JSON.stringify(partialContractUpdatePayload),
    });

    expect(response.status).toBe(200);
    expect(appContext.contractService.updateContract).toHaveBeenCalledWith(
      'org-1',
      'contract-1',
      partialContractUpdatePayload,
    );
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
      body: JSON.stringify(partialContractUpdatePayload),
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

  it('finalizes draft contracts', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1/finalize', {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(finalizedContract));
    expect(appContext.contractService.finalizeContract).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('returns conflict for invalid finalize transitions', async () => {
    appContext.contractService.finalizeContract.mockRejectedValueOnce(
      new ContractWorkflowError('Only draft contracts can be finalized'),
    );

    const response = await request(appContext.baseUrl, '/contracts/contract-1/finalize', {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Only draft contracts can be finalized',
        details: [],
      },
    });
  });

  it('archives finalized contracts', async () => {
    const response = await request(appContext.baseUrl, '/contracts/contract-1/archive', {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(archivedContract));
    expect(appContext.contractService.archiveContract).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('returns conflict for invalid archive transitions', async () => {
    appContext.contractService.archiveContract.mockRejectedValueOnce(
      new ContractWorkflowError('Only finalized contracts can be archived'),
    );

    const response = await request(appContext.baseUrl, '/contracts/contract-1/archive', {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Only finalized contracts can be archived',
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

  it('streams realtime updates for the selected organisation', async () => {
    const response = await new Promise<{ status: number; close: () => void }>((resolve, reject) => {
      const url = new URL('/events/contracts?organisation_id=org-1', appContext.baseUrl);
      const req = httpRequest(
        {
          hostname: url.hostname,
          port: Number(url.port),
          path: url.pathname + url.search,
          method: 'GET',
        },
        (streamResponse) => {
          resolve({
            status: streamResponse.statusCode ?? 0,
            close: () => req.destroy(),
          });
        },
      );

      req.on('error', reject);
      req.end();
    });

    expect(response.status).toBe(200);
    expect(appContext.realtimeBroadcaster.subscribe).toHaveBeenCalledWith(expect.anything(), 'org-1');
    response.close();
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

