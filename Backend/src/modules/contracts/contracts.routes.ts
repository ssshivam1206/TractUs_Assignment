import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { createSuccessResponse } from '../../common/api-response.js';
import { readOrganisationId, readRouteParam, sendConflictResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../common/http.js';
import { buildContractValidationErrorResponse, validateContractFieldData } from './contracts.validation.js';
import { ContractNotFoundError, ContractService, ContractWorkflowError, PrismaContractRepository } from './contracts.service.js';

const contractService = new ContractService(new PrismaContractRepository());

export function buildContractsRouter(): Router {
  const router = createRouter();

  router.post('/', handleCreateContract);
  router.get('/', handleListContracts);
  router.get('/:id', handleGetContract);
  router.patch('/:id', handleUpdateContract);
  router.delete('/:id', handleDeleteContract);

  return router;
}

async function handleCreateContract(req: Request, res: Response) {
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

async function handleListContracts(req: Request, res: Response) {
  const organisationId = readOrganisationId(req);
  if (!organisationId) {
    return sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'headers.x-organisation-id', message: 'x-organisation-id header is required' },
    ]);
  }

  const contracts = await contractService.listContracts(organisationId);
  return res.status(200).json(createSuccessResponse(contracts));
}

async function handleGetContract(req: Request, res: Response) {
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

async function handleUpdateContract(req: Request, res: Response) {
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

  const parsed = validateContractFieldData(req.body);
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

async function handleDeleteContract(req: Request, res: Response) {
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
