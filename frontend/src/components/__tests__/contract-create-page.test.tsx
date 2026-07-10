import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ContractCreatePage } from '@/components/contract-create-page';

const createContractMock = vi.fn();
const toFriendlyApiErrorMock = vi.fn();
const useOrganisationMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/lib/api', () => ({
  createContract: (...args: unknown[]) => createContractMock(...args),
  toFriendlyApiError: (...args: unknown[]) => toFriendlyApiErrorMock(...args),
}));

vi.mock('@/state/organisation-context', () => ({
  useOrganisation: () => useOrganisationMock(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('ContractCreatePage', () => {
  beforeEach(() => {
    createContractMock.mockReset();
    toFriendlyApiErrorMock.mockReset();
    pushMock.mockReset();
    useOrganisationMock.mockReturnValue({
      activeOrganisation: { id: 'org-b', name: 'Demo Org B' },
      activeOrganisationId: 'org-b',
      isLoading: false,
    });
  });

  it('blocks submission when no organisation is selected', async () => {
    useOrganisationMock.mockReturnValue({
      activeOrganisation: null,
      activeOrganisationId: null,
      isLoading: false,
    });

    render(<ContractCreatePage />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(createContractMock).not.toHaveBeenCalled();
    expect(screen.getByText('No organisation selected')).toBeInTheDocument();
  });

  it('shows client-side validation errors for invalid JSON', async () => {
    const user = userEvent.setup();

    render(<ContractCreatePage />);
    await user.clear(screen.getByLabelText('Contract JSON'));
    await user.type(screen.getByLabelText('Contract JSON'), 'not valid json');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(createContractMock).not.toHaveBeenCalled();
    expect(screen.getAllByText('The JSON is not valid. Check commas, brackets, and quotation marks.').length).toBeGreaterThan(0);
  });

  it('submits a valid contract and redirects to the detail page', async () => {
    const user = userEvent.setup();
    createContractMock.mockResolvedValue({ id: 'contract-123' });

    render(<ContractCreatePage />);
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createContractMock).toHaveBeenCalledWith('org-b', expect.objectContaining({ client_name: 'Acme Trading Private' }));
    });
    expect(pushMock).toHaveBeenCalledWith('/contracts/contract-123');
  });

  it('shows backend-friendly error feedback when create fails', async () => {
    const user = userEvent.setup();
    createContractMock.mockRejectedValue(new Error('network'));
    toFriendlyApiErrorMock.mockReturnValue({ kind: 'network', message: 'network', details: [] });

    render(<ContractCreatePage />);
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('We could not reach the backend. Check that the server is running and try again.')).toBeInTheDocument();
    });
  });
});


