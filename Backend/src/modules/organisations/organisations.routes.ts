import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { createSuccessResponse } from '../../common/api-response.js';
import { sendValidationErrorResponse } from '../../common/http.js';
import { PrismaOrganisationRepository } from './organisations.repository.js';
import {
  buildOrganisationValidationErrorResponse,
  validateOrganisationPayload,
} from './organisations.validation.js';
import { OrganisationService } from './organisations.service.js';

type OrganisationServiceLike = Pick<OrganisationService, 'createOrganisation' | 'listOrganisations'>;

const defaultOrganisationService = new OrganisationService(new PrismaOrganisationRepository());

export function buildOrganisationsRouter(
  organisationService: OrganisationServiceLike = defaultOrganisationService,
): Router {
  const router = createRouter();

  router.get('/', (req, res) => handleListOrganisations(organisationService, req, res));
  router.post('/', (req, res) => handleCreateOrganisation(organisationService, req, res));

  return router;
}

async function handleListOrganisations(
  organisationService: OrganisationServiceLike,
  _req: Request,
  res: Response,
) {
  const organisations = await organisationService.listOrganisations();
  return res.status(200).json(createSuccessResponse(organisations));
}

async function handleCreateOrganisation(
  organisationService: OrganisationServiceLike,
  req: Request,
  res: Response,
) {
  const parsed = validateOrganisationPayload(req.body);
  if (!parsed.success) {
    return res.status(400).json(buildOrganisationValidationErrorResponse(parsed.error));
  }

  const created = await organisationService.createOrganisation(parsed.data);
  return res.status(201).json(createSuccessResponse(created));
}
