import type { ApiErrorDetail } from './api';

export type ContractStatus = 'DRAFT' | 'FINALIZED' | 'ARCHIVED';

export type ContractItem = {
  description: string;
  quantity: number;
  quantity_unit?: string;
  unit_price: number;
  pricing_unit?: string;
  total?: number;
};

export type ContractFieldData = {
  client_name: string;
  po_ref_no: string;
  po_date: string;
  payment_terms?: string;
  delivery_terms?: string;
  items: ContractItem[];
};

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

export type ContractCreateInput = ContractFieldData;
export type ContractUpdateInput = Partial<ContractFieldData>;

export type ContractValidationError = {
  code: 'VALIDATION_ERROR';
  message: string;
  details: ApiErrorDetail[];
};
