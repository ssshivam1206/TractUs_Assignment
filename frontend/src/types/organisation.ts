import type { ApiErrorDetail } from './api';

export type Organisation = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type OrganisationCreateInput = {
  name: string;
};

export type OrganisationValidationError = {
  code: 'VALIDATION_ERROR';
  message: string;
  details: ApiErrorDetail[];
};
