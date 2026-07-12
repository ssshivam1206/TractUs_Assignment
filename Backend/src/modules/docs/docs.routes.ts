import type { Router } from 'express';
import { Router as createRouter } from 'express';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'TractUs Contract Operations API',
    version: '1.0.0',
    description: 'Assignment backend API for organisation-scoped contract intake, workflow actions, audit history, realtime events, and PDF attachments.',
  },
  servers: [{ url: 'http://localhost:8001' }],
  tags: [
    { name: 'Health' },
    { name: 'Organisations' },
    { name: 'Contracts' },
    { name: 'Audit Trail' },
    { name: 'Realtime' },
    { name: 'Attachments' },
  ],
  components: {
    securitySchemes: {
      OrganisationHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-organisation-id',
        description: 'Active organisation scope for tenant-specific contract operations.',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'OK' },
        },
      },
      Organisation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ContractItem: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          quantity_unit: { type: 'string' },
          unit_price: { type: 'number' },
          pricing_unit: { type: 'string' },
          total: { type: 'number' },
        },
        required: ['description', 'quantity', 'unit_price'],
      },
      ContractFieldData: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          po_ref_no: { type: 'string' },
          po_date: { type: 'string', format: 'date' },
          payment_terms: { type: 'string' },
          delivery_terms: { type: 'string' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/ContractItem' },
          },
        },
        required: ['client_name', 'po_ref_no', 'po_date', 'items'],
      },
      Contract: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organisation_id: { type: 'string', format: 'uuid' },
          client_name: { type: 'string' },
          po_ref_no: { type: 'string' },
          po_date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['DRAFT', 'FINALIZED', 'ARCHIVED'] },
          field_data: { $ref: '#/components/schemas/ContractFieldData' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          finalized_at: { type: ['string', 'null'], format: 'date-time' },
          archived_at: { type: ['string', 'null'], format: 'date-time' },
          deleted_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      ContractListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Contract' },
          },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          total_pages: { type: 'integer' },
        },
      },
      ContractEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          contract_id: { type: 'string', format: 'uuid' },
          organisation_id: { type: 'string', format: 'uuid' },
          event_type: { type: 'string', enum: ['CREATE', 'UPDATE', 'FINALIZE', 'ARCHIVE', 'DELETE'] },
          before_state: {
            oneOf: [
              { $ref: '#/components/schemas/Contract' },
              { type: 'null' },
            ],
          },
          after_state: {
            oneOf: [
              { $ref: '#/components/schemas/Contract' },
              { type: 'null' },
            ],
          },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ContractAttachment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          contract_id: { type: 'string', format: 'uuid' },
          organisation_id: { type: 'string', format: 'uuid' },
          original_name: { type: 'string' },
          mime_type: { type: 'string', example: 'application/pdf' },
          file_size: { type: 'integer' },
          storage_path: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: true },
          data: {},
        },
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Backend health check',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/organisations': {
      get: {
        tags: ['Organisations'],
        responses: {
          '200': {
            description: 'List organisations',
          },
        },
      },
      post: {
        tags: ['Organisations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Create organisation',
          },
        },
      },
    },
    '/contracts': {
      get: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['DRAFT', 'FINALIZED', 'ARCHIVED'] } },
          { in: 'query', name: 'client_name', schema: { type: 'string' } },
          { in: 'query', name: 'contract_id', schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50 } },
        ],
        responses: {
          '200': { description: 'List contracts' },
        },
      },
      post: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContractFieldData' },
            },
          },
        },
        responses: {
          '201': { description: 'Create contract' },
        },
      },
    },
    '/contracts/{id}': {
      get: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Get contract' }, '404': { description: 'Missing contract' } },
      },
      patch: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContractFieldData' },
            },
          },
        },
        responses: { '200': { description: 'Update contract' }, '409': { description: 'Workflow conflict' } },
      },
      delete: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Delete contract' }, '409': { description: 'Workflow conflict' } },
      },
    },
    '/contracts/{id}/finalize': {
      post: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Finalize contract' }, '409': { description: 'Workflow conflict' } },
      },
    },
    '/contracts/{id}/archive': {
      post: {
        tags: ['Contracts'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Archive contract' }, '409': { description: 'Workflow conflict' } },
      },
    },
    '/contracts/{id}/events': {
      get: {
        tags: ['Audit Trail'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List contract events in chronological order' } },
      },
    },
    '/contracts/{id}/attachments': {
      get: {
        tags: ['Attachments'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List PDF attachments for a contract' } },
      },
      post: {
        tags: ['Attachments'],
        security: [{ OrganisationHeader: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Single PDF attachment up to 10 MB',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: { '201': { description: 'Upload PDF attachment' } },
      },
    },
    '/events/contracts': {
      get: {
        tags: ['Realtime'],
        security: [{ OrganisationHeader: [] }],
        description: 'Server-Sent Events stream for contract lifecycle updates. Events emit named lifecycle transitions with contract id, organisation id, statuses, and timestamp.',
        responses: {
          '200': {
            description: 'SSE stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  example: 'event: contract.updated\\ndata: {"contract_id":"..."}\\n\\n',
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export function buildDocsRouter(): Router {
  const router = createRouter();

  router.get('/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  router.get('/', (req, res) => {
    const specUrl = `${req.protocol}://${req.get('host')}/docs/openapi.json`;
    res.status(200).type('html').send(buildSwaggerHtml(specUrl));
  });

  return router;
}

function buildSwaggerHtml(specUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TractUs API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f8fafc; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
      });
    </script>
  </body>
</html>`;
}
