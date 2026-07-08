import type { NormalizedApiError } from './errors';

export function getFriendlyApiErrorMessage(error: NormalizedApiError): string {
  switch (error.kind) {
    case 'validation':
      return error.message || 'Please fix the highlighted fields and try again.';
    case 'not_found':
      return 'The requested item could not be found. It may have been moved or deleted.';
    case 'conflict':
      return error.message || 'The requested action is not allowed in the current workflow state.';
    case 'network':
      return 'We could not reach the backend. Check that the server is running and try again.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

export function getFriendlyApiSummary(error: NormalizedApiError): string {
  if (error.details.length === 0) {
    return getFriendlyApiErrorMessage(error);
  }

  const [firstDetail] = error.details;
  return `${getFriendlyApiErrorMessage(error)} (${firstDetail.path}: ${firstDetail.message})`;
}
