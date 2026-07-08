import type { ContractStatus } from './contracts.rules.js';
import type { ContractFieldData } from './contracts.validation.js';

export type ContractApiObject = {
  id: string;
  organisation_id: string;
  client_name: string;
  po_ref_no: string;
  po_date: string;
  status: ContractStatus;
  field_data: ContractFieldData;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

export type ContractAuditEventType = 'CREATE' | 'UPDATE' | 'FINALIZE' | 'ARCHIVE' | 'DELETE';

export type ContractAuditSnapshot = ContractApiObject;

export type ContractEventApiObject = {
  id: string;
  contract_id: string;
  organisation_id: string;
  event_type: ContractAuditEventType;
  before_state: ContractAuditSnapshot | null;
  after_state: ContractAuditSnapshot | null;
  created_at: string;
};

export type ContractRealtimeEventName =
  | 'contract.created'
  | 'contract.updated'
  | 'contract.finalized'
  | 'contract.archived'
  | 'contract.deleted';

export type ContractRealtimeEvent = {
  event_name: ContractRealtimeEventName;
  contract_id: string;
  organisation_id: string;
  old_status: ContractStatus | null;
  new_status: ContractStatus | null;
  updated_at: string;
  client_name: string;
};

export type ContractListFilters = {
  status?: ContractStatus;
  clientName?: string;
  contractId?: string;
  page: number;
  limit: number;
  offset: number;
};

export type ContractListResponse = {
  items: ContractApiObject[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ContractEventListResponse = ContractEventApiObject[];

export type ContractCreateInput = ContractFieldData;
export type ContractUpdateInput = Partial<ContractFieldData>;
