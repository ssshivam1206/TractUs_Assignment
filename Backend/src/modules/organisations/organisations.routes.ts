import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { createSuccessResponse } from '../../common/api-response.js';
import { sendValidationErrorResponse } from '../../common/http.js';
import { PrismaOrganisationRepository } from './organisations.repository.js';
import { OrganisationService } from './organisations.service.js';
import { buildOrganisationValidationErrorResponse, validateOrganisationPayload } from './organisations.validation.js';

const organisationService = new OrganisationService(new PrismaOrganisationRepository());

export function buildOrganisationsRouter(): Router {
  const router = createRouter();

  router.get('/', handleListOrganisations);
  router.post('/', handleCreateOrganisation);

  return router;
}

async function handleListOrganisations(_req: Request, res: Response) {
  const organisations = await organisationService.listOrganisations();
  return res.status(200).json(createSuccessResponse(organisations));
}

async function handleCreateOrganisation(req: Request, res: Response) {
  const parsed = validateOrganisationPayload(req.body);
  if (!parsed.success) {
    return res.status(400).json(buildOrganisationValidationErrorResponse(parsed.error));
  }

  const created = await organisationService.createOrganisation(parsed.data);
  return res.status(201).json(createSuccessResponse(created));
}
