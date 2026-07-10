import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ContractListPage } from '@/components/contract-list-page';
import type { ContractApiObject } from '@/types/contract';

const listContractsMock = vi.fn();
const toFriendlyApiErrorMock = vi.fn();
const useOrganisationMock = vi.fn();

vi.mock('@/lib/api', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
  toFriendlyApiError: (...args: unknown[]) => toFriendlyApiErrorMock(...args),
}));

vi.mock('@/state/organisation-context', () => ({
  useOrganisation: () => useOrganisationMock(),
}));

const contracts: ContractApiObject[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    organisation_id: 'org-b',
    client_name: 'Acme Trading Private',
    po_ref_no: 'PO-1001',
    po_date: '2026-07-05',
    status: 'DRAFT',
    field_data: {
      client_name: 'Acme Trading Private',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      payment_terms: 'Net 30',
      delivery_terms: 'FOB',
      items: [{ description: 'Steel bolts', quantity: 1, unit_price: 1 }],
    },
    created_at: '2026-07-05T10:00:00.000Z',
    updated_at: '2026-07-05T11:00:00.000Z',
    finalized_at: null,
    archived_at: null,
    deleted_at: null,
  },
];

describe('ContractListPage', () => {
  beforeEach(() => {
    listContractsMock.mockReset();
    toFriendlyApiErrorMock.mockReset();
    useOrganisationMock.mockReturnValue({ realtimeVersion: 0 });
    listContractsMock.mockResolvedValue({
      items: contracts,
      page: 1,
      limit: 10,
      total: 12,
      total_pages: 2,
    });
  });

  it('shows the scoped empty state when no organisation is selected', () => {
    render(<ContractListPage organisationId={null} />);

    expect(screen.getByText('Select an organisation to load contracts for that workspace.')).toBeInTheDocument();
  });

  it('renders backend contracts and refetches when filters and pagination change', async () => {
    const user = userEvent.setup();
    render(<ContractListPage organisationId="org-b" />);

    await waitFor(() => {
      expect(listContractsMock).toHaveBeenCalledWith('org-b', {
        status: undefined,
        clientName: undefined,
        contractId: undefined,
        page: 1,
        limit: 10,
      });
    });
    expect(screen.getAllByText('Acme Trading Private').length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('Search by client'), 'Zenith');
    await waitFor(() => {
      expect(listContractsMock).toHaveBeenLastCalledWith('org-b', {
        status: undefined,
        clientName: 'Zenith',
        contractId: undefined,
        page: 1,
        limit: 10,
      });
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(listContractsMock).toHaveBeenLastCalledWith('org-b', {
        status: undefined,
        clientName: 'Zenith',
        contractId: undefined,
        page: 2,
        limit: 10,
      });
    });
  });

  it('shows a friendly backend error message when loading fails', async () => {
    listContractsMock.mockRejectedValue(new Error('network'));
    toFriendlyApiErrorMock.mockReturnValue({ kind: 'network', message: 'network', details: [] });

    render(<ContractListPage organisationId="org-b" />);

    await waitFor(() => {
      expect(screen.getByText('Could not load contracts')).toBeInTheDocument();
    });
    expect(screen.getByText('We could not reach the backend. Check that the server is running and try again.')).toBeInTheDocument();
  });
});

