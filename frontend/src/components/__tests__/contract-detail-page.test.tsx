import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ContractDetailPage } from '@/components/contract-detail-page';
import type { ContractApiObject } from '@/types/contract';

const archiveContractMock = vi.fn();
const deleteContractMock = vi.fn();
const finalizeContractMock = vi.fn();
const getContractMock = vi.fn();
const getContractEventsMock = vi.fn();
const getContractAttachmentsMock = vi.fn();
const toFriendlyApiErrorMock = vi.fn();
const updateContractMock = vi.fn();
const uploadContractAttachmentMock = vi.fn();
const useOrganisationMock = vi.fn();

vi.mock('@/lib/api', () => ({
  archiveContract: (...args: unknown[]) => archiveContractMock(...args),
  deleteContract: (...args: unknown[]) => deleteContractMock(...args),
  finalizeContract: (...args: unknown[]) => finalizeContractMock(...args),
  getContract: (...args: unknown[]) => getContractMock(...args),
  getContractEvents: (...args: unknown[]) => getContractEventsMock(...args),
  getContractAttachments: (...args: unknown[]) => getContractAttachmentsMock(...args),
  toFriendlyApiError: (...args: unknown[]) => toFriendlyApiErrorMock(...args),
  updateContract: (...args: unknown[]) => updateContractMock(...args),
  uploadContractAttachment: (...args: unknown[]) => uploadContractAttachmentMock(...args),
}));

vi.mock('@/state/organisation-context', () => ({
  useOrganisation: () => useOrganisationMock(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/organisation-selector', () => ({
  OrganisationSelector: () => <div>Organisation selector</div>,
}));

vi.mock('@/components/contract-audit-trail', () => ({
  ContractAuditTrail: () => <div>Audit trail</div>,
}));

function makeContract(status: 'DRAFT' | 'FINALIZED' | 'ARCHIVED'): ContractApiObject {
  return {
    id: 'contract-1',
    organisation_id: 'org-b',
    client_name: 'Zenith Exports LLP',
    po_ref_no: 'PO-2048',
    po_date: '2026-07-09',
    status,
    field_data: {
      client_name: 'Zenith Exports LLP',
      po_ref_no: 'PO-2048',
      po_date: '2026-07-09',
      payment_terms: 'Net 15',
      delivery_terms: 'CIF Chennai',
      items: [
        { description: 'Aluminium sheets', quantity: 12, quantity_unit: 'tons', unit_price: 980, pricing_unit: 'per ton', total: 11760 },
      ],
    },
    created_at: '2026-07-09T00:00:00.000Z',
    updated_at: '2026-07-09T01:00:00.000Z',
    finalized_at: status === 'DRAFT' ? null : '2026-07-09T01:10:00.000Z',
    archived_at: status === 'ARCHIVED' ? '2026-07-09T01:20:00.000Z' : null,
    deleted_at: null,
  };
}

describe('ContractDetailPage', () => {
  beforeEach(() => {
    archiveContractMock.mockReset();
    deleteContractMock.mockReset();
    finalizeContractMock.mockReset();
    getContractMock.mockReset();
    getContractEventsMock.mockReset();
    getContractAttachmentsMock.mockReset();
    toFriendlyApiErrorMock.mockReset();
    updateContractMock.mockReset();
    uploadContractAttachmentMock.mockReset();
    useOrganisationMock.mockReturnValue({
      activeOrganisation: { id: 'org-b', name: 'Demo Org B' },
      activeOrganisationId: 'org-b',
      isLoading: false,
      latestContractEvent: null,
    });
    getContractEventsMock.mockResolvedValue([]);
    getContractAttachmentsMock.mockResolvedValue([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders archived contracts as locked and non-editable', async () => {
    getContractMock.mockResolvedValue(makeContract('ARCHIVED'));

    render(<ContractDetailPage contractId="contract-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zenith Exports LLP' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Editing is disabled because this contract is/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument();
  });

  it('submits only changed fields when saving a draft edit', async () => {
    const draftContract = makeContract('DRAFT');
    const updatedContract = {
      ...draftContract,
      client_name: 'Zenith Export House',
      field_data: { ...draftContract.field_data, client_name: 'Zenith Export House' },
    };
    getContractMock.mockResolvedValue(draftContract);
    updateContractMock.mockResolvedValue(updatedContract);
    const user = userEvent.setup();

    render(<ContractDetailPage contractId="contract-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit draft' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Edit draft' }));
    await user.clear(screen.getByLabelText('Client name'));
    await user.type(screen.getByLabelText('Client name'), 'Zenith Export House');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateContractMock).toHaveBeenCalledWith('org-b', 'contract-1', { client_name: 'Zenith Export House' });
    });
  });

  it('runs finalize action and shows a friendly conflict message when the workflow fails', async () => {
    getContractMock.mockResolvedValue(makeContract('DRAFT'));
    finalizeContractMock.mockRejectedValue(new Error('conflict'));
    toFriendlyApiErrorMock.mockReturnValue({ kind: 'conflict', message: 'Contract cannot be finalized now.', details: [] });
    const user = userEvent.setup();

    render(<ContractDetailPage contractId="contract-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finalize' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Finalize' }));

    await waitFor(() => {
      expect(finalizeContractMock).toHaveBeenCalledWith('org-b', 'contract-1');
    });
    expect(screen.getAllByText('Contract cannot be finalized now.').length).toBeGreaterThan(0);
  });
});


