import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createSuccessResponse } from '../src/common/api-response.js';
import { buildContractsRouter } from '../src/modules/contracts/contracts.routes.js';
import { buildDocsRouter } from '../src/modules/docs/docs.routes.js';
import { buildOrganisationsRouter } from '../src/modules/organisations/organisations.routes.js';
import { buildRealtimeRouter } from '../src/modules/realtime/realtime.routes.js';
import { ContractAttachmentValidationError } from '../src/modules/contracts/contracts.attachments.js';
import { ContractNotFoundError } from '../src/modules/contracts/contracts.service.js';

const createdOrganisation = {
  id: 'org-1',
  name: 'Demo Org',
  created_at: '2026-07-05T00:00:00.000Z',
  updated_at: '2026-07-05T00:00:00.000Z',
} as const;

const contractAttachment = {
  id: 'attachment-1',
  contract_id: 'contract-1',
  organisation_id: 'org-1',
  original_name: 'terms.pdf',
  mime_type: 'application/pdf',
  file_size: 128,
  storage_path: 'uploads/contract-1/file.pdf',
  created_at: '2026-07-11T10:00:00.000Z',
} as const;

async function startTestApp() {
  const contractService = {
    createContract: vi.fn(),
    listContracts: vi.fn(),
    getContract: vi.fn(),
    listContractEvents: vi.fn(),
    updateContract: vi.fn(),
    finalizeContract: vi.fn(),
    archiveContract: vi.fn(),
    deleteContract: vi.fn(),
  };

  const contractAttachmentService = {
    listContractAttachments: vi.fn(async () => [contractAttachment]),
    createContractAttachment: vi.fn(async (_organisationId: string, _contractId: string, upload: { mimeType: string }) => {
      if (upload.mimeType !== 'application/pdf') {
        throw new ContractAttachmentValidationError('Only PDF files are allowed');
      }

      return contractAttachment;
    }),
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
  app.use('/docs', buildDocsRouter());
  app.use('/contracts', buildContractsRouter(contractService as never, contractAttachmentService as never));
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
    contractAttachmentService,
  };
}

describe('bonus docs and attachment routes', () => {
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

  it('serves the OpenAPI document', async () => {
    const response = await fetch(`${appContext.baseUrl}/docs/openapi.json`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      openapi: '3.1.0',
      info: { title: 'TractUs Contract Operations API' },
      paths: expect.objectContaining({
        '/contracts/{id}/attachments': expect.any(Object),
        '/events/contracts': expect.any(Object),
      }),
    });
  });

  it('serves the Swagger docs page', async () => {
    const response = await fetch(`${appContext.baseUrl}/docs`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    await expect(response.text()).resolves.toContain('swagger-ui');
  });

  it('lists contract attachments inside organisation scope', async () => {
    const response = await fetch(`${appContext.baseUrl}/contracts/contract-1/attachments`, {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createSuccessResponse([contractAttachment]));
    expect(appContext.contractAttachmentService.listContractAttachments).toHaveBeenCalledWith('org-1', 'contract-1');
  });

  it('uploads a valid PDF attachment', async () => {
    const formData = new FormData();
    formData.set(
      'file',
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'terms.pdf', {
        type: 'application/pdf',
      }),
    );

    const response = await fetch(`${appContext.baseUrl}/contracts/contract-1/attachments`, {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: formData,
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(createSuccessResponse(contractAttachment));
    expect(appContext.contractAttachmentService.createContractAttachment).toHaveBeenCalledWith(
      'org-1',
      'contract-1',
      expect.objectContaining({
        originalName: 'terms.pdf',
        mimeType: 'application/pdf',
      }),
    );
  });

  it('rejects non-PDF uploads', async () => {
    const formData = new FormData();
    formData.set(
      'file',
      new File(['not a pdf'], 'notes.txt', {
        type: 'text/plain',
      }),
    );

    const response = await fetch(`${appContext.baseUrl}/contracts/contract-1/attachments`, {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: formData,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Attachment upload is invalid',
        details: [{ path: 'file', message: 'Only PDF files are allowed' }],
      },
    });
  });

  it('returns 404 when listing attachments for a missing contract', async () => {
    appContext.contractAttachmentService.listContractAttachments.mockRejectedValueOnce(
      new ContractNotFoundError(),
    );

    const response = await fetch(`${appContext.baseUrl}/contracts/missing-contract/attachments`, {
      headers: {
        'x-organisation-id': 'org-1',
      },
    });

    expect(response.status).toBe(404);
  });

  it('returns 404 when uploading into a missing contract', async () => {
    appContext.contractAttachmentService.createContractAttachment.mockRejectedValueOnce(
      new ContractNotFoundError(),
    );

    const formData = new FormData();
    formData.set(
      'file',
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'terms.pdf', {
        type: 'application/pdf',
      }),
    );

    const response = await fetch(`${appContext.baseUrl}/contracts/missing-contract/attachments`, {
      method: 'POST',
      headers: {
        'x-organisation-id': 'org-1',
      },
      body: formData,
    });

    expect(response.status).toBe(404);
  });
});

