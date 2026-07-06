import type { ContractApiObject, ContractCreateInput, ContractListFilters, ContractListResponse, ContractUpdateInput } from '@/types/contract';
import type { Organisation, OrganisationCreateInput } from '@/types/organisation';
import { createApiClient } from './http';
import { normalizeApiError, type NormalizedApiError } from './errors';

const client = createApiClient();

export async function getOrganisations(): Promise<Organisation[]> {
  return client.request<Organisation[]>('/organisations');
}

export async function createOrganisation(payload: OrganisationCreateInput): Promise<Organisation> {
  return client.request<Organisation>('/organisations', {
    method: 'POST',
    body: payload,
  });
}

export async function listContracts(
  organisationId: string,
  filters: Partial<ContractListFilters> = {},
): Promise<ContractListResponse> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.clientName) {
    params.set('client_name', filters.clientName);
  }

  if (filters.contractId) {
    params.set('contract_id', filters.contractId);
  }

  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 10));

  const query = params.toString();
  const path = query ? `/contracts?${query}` : '/contracts';

  return client.request<ContractListResponse>(path, {
    organisationId,
  });
}

export async function getContract(
  organisationId: string,
  contractId: string,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>(`/contracts/${contractId}`, {
    organisationId,
  });
}

export async function createContract(
  organisationId: string,
  payload: ContractCreateInput,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>('/contracts', {
    method: 'POST',
    organisationId,
    body: payload,
  });
}

export async function updateContract(
  organisationId: string,
  contractId: string,
  payload: ContractUpdateInput,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>(`/contracts/${contractId}`, {
    method: 'PATCH',
    organisationId,
    body: payload,
  });
}

export async function finalizeContract(
  organisationId: string,
  contractId: string,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>(`/contracts/${contractId}/finalize`, {
    method: 'POST',
    organisationId,
  });
}

export async function archiveContract(
  organisationId: string,
  contractId: string,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>(`/contracts/${contractId}/archive`, {
    method: 'POST',
    organisationId,
  });
}

export async function deleteContract(
  organisationId: string,
  contractId: string,
): Promise<ContractApiObject> {
  return client.request<ContractApiObject>(`/contracts/${contractId}`, {
    method: 'DELETE',
    organisationId,
  });
}

export function toFriendlyApiError(error: unknown): NormalizedApiError {
  return normalizeApiError(error);
}
