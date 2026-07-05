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

export type ContractCreateInput = ContractFieldData;
export type ContractUpdateInput = ContractFieldData;
