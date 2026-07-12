import path from 'node:path';
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import multer from 'multer';
import { createSuccessResponse } from '../../common/api-response.js';
import {
  readOrganisationId,
  readRouteParam,
  sendConflictResponse,
  sendNotFoundResponse,
  sendValidationErrorResponse,
} from '../../common/http.js';
import {
  ContractAttachmentService,
  ContractAttachmentValidationError,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './contracts.attachments.js';
import {
  buildContractValidationErrorResponse,
  parseContractListQuery,
  validateContractFieldData,
  validateContractUpdateFieldData,
} from './contracts.validation.js';
import {
  ContractNotFoundError,
  ContractService,
  ContractWorkflowError,
  PrismaContractRepository,
} from './contracts.service.js';
import type { ContractListFilters } from './contracts.types.js';

type ContractServiceLike = Pick<
  ContractService,
  | 'createContract'
  | 'listContracts'
  | 'getContract'
  | 'listContractEvents'
  | 'updateContract'
  | 'finalizeContract'
  | 'archiveContract'
  | 'deleteContract'
>;

type ContractAttachmentServiceLike = Pick<
  ContractAttachmentService,
  'createContractAttachment' | 'listContractAttachments'
>;

const defaultContractService = new ContractService(new PrismaContractRepository());
const defaultContractAttachmentService = new ContractAttachmentService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
  },
});

export function buildContractsRouter(
  contractService: ContractServiceLike = defaultContractService,
  contractAttachmentService: ContractAttachmentServiceLike = defaultContractAttachmentService,
): Router {
  const router = createRouter();

  router.post('/', (req, res) => handleCreateContract(contractService, req, res));
  router.get('/', (req, res) => handleListContracts(contractService, req, res));
  router.get('/:id', (req, res) => handleGetContract(contractService, req, res));
  router.get('/:id/events', (req, res) => handleListContractEvents(contractService, req, res));
  router.get('/:id/attachments', (req, res) =>
    handleListContractAttachments(contractAttachmentService, req, res),
  );
  router.post('/:id/attachments', (req, res) => {
    upload.single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return sendValidationErrorResponse(res, 'Attachment upload is invalid', [
            { path: 'file', message: 'PDF must be 10 MB or smaller' },
          ]);
        }

        return sendValidationErrorResponse(res, 'Attachment upload is invalid', [
          { path: 'file', message: error.message },
        ]);
      }

      if (error) {
        throw error;
      }

      return handleCreateContractAttachment(contractAttachmentService, req, res);
    });
  });
  router.patch('/:id', (req, res) => handleUpdateContract(contractService, req, res));
  router.post('/:id/finalize', (req, res) => handleFinalizeContract(contractService, req, res));
  router.post('/:id/archive', (req, res) => handleArchiveContract(contractService, req, res));
  router.delete('/:id', (req, res) => handleDeleteContract(contractService, req, res));

  return router;
}

async function handleCreateContract(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const parsed = validateContractFieldData(req.body);
  if (!parsed.success) {
    return res.status(400).json(buildContractValidationErrorResponse(parsed.error));
  }

  const created = await contractService.createContract(organisationId, parsed.data);
  return res.status(201).json(createSuccessResponse(created));
}

async function handleListContracts(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const parsed = parseContractListQuery(req.query);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const contracts = await contractService.listContracts(
    organisationId,
    parsed.data as ContractListFilters,
  );
  return res.status(200).json(createSuccessResponse(contracts));
}

async function handleGetContract(contractService: ContractServiceLike, req: Request, res: Response) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const contract = await contractService.getContract(organisationId, contractId);
    return res.status(200).json(createSuccessResponse(contract));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    throw error;
  }
}

async function handleListContractEvents(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const events = await contractService.listContractEvents(organisationId, contractId);
    return res.status(200).json(createSuccessResponse(events));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    throw error;
  }
}

async function handleListContractAttachments(
  contractAttachmentService: ContractAttachmentServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const attachments = await contractAttachmentService.listContractAttachments(
      organisationId,
      contractId,
    );
    return res.status(200).json(createSuccessResponse(attachments));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    throw error;
  }
}

async function handleCreateContractAttachment(
  contractAttachmentService: ContractAttachmentServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  if (!req.file) {
    return sendValidationErrorResponse(res, 'Attachment upload is invalid', [
      { path: 'file', message: 'A single PDF file is required' },
    ]);
  }

  try {
    const attachment = await contractAttachmentService.createContractAttachment(
      organisationId,
      contractId,
      {
        originalName: sanitizeOriginalName(req.file.originalname),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        buffer: req.file.buffer,
      },
    );

    return res.status(201).json(createSuccessResponse(attachment));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    if (error instanceof ContractAttachmentValidationError) {
      return sendValidationErrorResponse(res, 'Attachment upload is invalid', [
        { path: 'file', message: error.message },
      ]);
    }

    throw error;
  }
}

async function handleUpdateContract(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  const parsed = validateContractUpdateFieldData(req.body);
  if (!parsed.success) {
    return res.status(400).json(buildContractValidationErrorResponse(parsed.error));
  }

  try {
    const updated = await contractService.updateContract(organisationId, contractId, parsed.data);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    if (error instanceof ContractWorkflowError) {
      return sendConflictResponse(res, error.message);
    }

    throw error;
  }
}

async function handleFinalizeContract(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const finalized = await contractService.finalizeContract(organisationId, contractId);
    return res.status(200).json(createSuccessResponse(finalized));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    if (error instanceof ContractWorkflowError) {
      return sendConflictResponse(res, error.message);
    }

    throw error;
  }
}

async function handleArchiveContract(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const archived = await contractService.archiveContract(organisationId, contractId);
    return res.status(200).json(createSuccessResponse(archived));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    if (error instanceof ContractWorkflowError) {
      return sendConflictResponse(res, error.message);
    }

    throw error;
  }
}

async function handleDeleteContract(
  contractService: ContractServiceLike,
  req: Request,
  res: Response,
) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contractId = readRouteParam(req, 'id');
  if (!contractId) {
    return sendValidationErrorResponse(res, 'Contract id is required', [
      { path: 'params.id', message: 'id is required' },
    ]);
  }

  try {
    const deleted = await contractService.deleteContract(organisationId, contractId);
    return res.status(200).json(createSuccessResponse(deleted));
  } catch (error) {
    if (error instanceof ContractNotFoundError) {
      return sendNotFoundResponse(res, 'Contract not found');
    }

    if (error instanceof ContractWorkflowError) {
      return sendConflictResponse(res, error.message);
    }

    throw error;
  }
}

function sanitizeOriginalName(fileName: string) {
  const trimmed = fileName.trim();
  const normalized = path.basename(trimmed);

  return normalized.length > 0 ? normalized : 'attachment.pdf';
}
