import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { createSuccessResponse } from '../../common/api-response.js';
import {
  readOrganisationId,
  readRouteParam,
  sendConflictResponse,
  sendNotFoundResponse,
  sendValidationErrorResponse,
} from '../../common/http.js';
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
  'createContract' | 'listContracts' | 'getContract' | 'updateContract' | 'finalizeContract' | 'archiveContract' | 'deleteContract'
>;

const defaultContractService = new ContractService(new PrismaContractRepository());

export function buildContractsRouter(
  contractService: ContractServiceLike = defaultContractService,
): Router {
  const router = createRouter();

  router.post('/', (req, res) => handleCreateContract(contractService, req, res));
  router.get('/', (req, res) => handleListContracts(contractService, req, res));
  router.get('/:id', (req, res) => handleGetContract(contractService, req, res));
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
