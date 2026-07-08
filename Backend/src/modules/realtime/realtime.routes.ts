import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { readQueryParam, sendValidationErrorResponse } from '../../common/http.js';
import { contractRealtimeBroadcaster } from './contracts-stream.js';

type ContractRealtimeStreamBroadcaster = {
  subscribe(response: Response, organisationId: string): void;
};

export function buildRealtimeRouter(
  broadcaster: ContractRealtimeStreamBroadcaster = contractRealtimeBroadcaster,
): Router {
  const router = createRouter();

  router.get('/contracts', (req, res) => handleContractsStream(broadcaster, req, res));

  return router;
}

function handleContractsStream(
  broadcaster: ContractRealtimeStreamBroadcaster,
  req: Request,
  res: Response,
): void {
  const organisationId = readQueryParam(req, 'organisation_id');

  if (!organisationId) {
    sendValidationErrorResponse(res, 'Organisation scope is required', [
      { path: 'query.organisation_id', message: 'organisation_id query parameter is required' },
    ]);
    return;
  }

  broadcaster.subscribe(res, organisationId);
}

