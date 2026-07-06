export const CONTRACT_STATUSES = ['DRAFT', 'FINALIZED', 'ARCHIVED'] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ['FINALIZED'],
  FINALIZED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function isDraftContractStatus(status: ContractStatus): boolean {
  return status === 'DRAFT';
}

export function isFinalizedContractStatus(status: ContractStatus): boolean {
  return status === 'FINALIZED';
}

export function canTransitionContractStatus(
  currentStatus: ContractStatus,
  nextStatus: ContractStatus,
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function getAllowedNextStatuses(
  currentStatus: ContractStatus,
): ContractStatus[] {
  return [...allowedTransitions[currentStatus]];
}

export function isSameOrganisation(
  organisationId: string,
  resourceOrganisationId: string,
): boolean {
  return organisationId === resourceOrganisationId;
}
