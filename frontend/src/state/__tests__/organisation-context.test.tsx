import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OrganisationProvider, useOrganisation } from '@/state/organisation-context';
import type { Organisation } from '@/types/organisation';

const getOrganisationsMock = vi.fn();
const getApiBaseUrlMock = vi.fn(() => 'http://localhost:4000');

vi.mock('@/lib/api', () => ({
  getOrganisations: (...args: unknown[]) => getOrganisationsMock(...args),
  getApiBaseUrl: (...args: unknown[]) => getApiBaseUrlMock(...args),
}));

function Consumer() {
  const {
    activeOrganisation,
    activeOrganisationId,
    latestContractEvent,
    realtimeVersion,
    setActiveOrganisationId,
  } = useOrganisation();

  return (
    <div>
      <p data-testid="active-id">{activeOrganisationId ?? 'none'}</p>
      <p data-testid="active-name">{activeOrganisation?.name ?? 'none'}</p>
      <p data-testid="realtime-version">{String(realtimeVersion)}</p>
      <p data-testid="latest-event">{latestContractEvent?.event_name ?? 'none'}</p>
      <button type="button" onClick={() => setActiveOrganisationId('org-b')}>
        Select Org B
      </button>
    </div>
  );
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  close = vi.fn();
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
}

const organisations: Organisation[] = [
  {
    id: 'org-a',
    name: 'Demo Org A',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'org-b',
    name: 'Demo Org B',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
];

describe('OrganisationProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    FakeEventSource.instances = [];
    getOrganisationsMock.mockReset();
    getApiBaseUrlMock.mockReturnValue('http://localhost:4000');
    Object.defineProperty(window, 'EventSource', {
      writable: true,
      value: FakeEventSource,
    });
  });

  it('loads organisations, restores the persisted selection, and receives realtime events', async () => {
    localStorage.setItem('tractus.activeOrganisationId', 'org-b');
    getOrganisationsMock.mockResolvedValue(organisations);

    render(
      <OrganisationProvider>
        <Consumer />
      </OrganisationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-id')).toHaveTextContent('org-b');
      expect(screen.getByTestId('active-name')).toHaveTextContent('Demo Org B');
    });

    await waitFor(() => {
      expect(FakeEventSource.instances).toHaveLength(1);
    });
    expect(FakeEventSource.instances[0]?.url).toContain('organisation_id=org-b');

    const finalizedHandler = FakeEventSource.instances[0]?.addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'contract.finalized',
    )?.[1] as ((event: MessageEvent<string>) => void) | undefined;

    finalizedHandler?.({
      data: JSON.stringify({
        event_name: 'contract.finalized',
        contract_id: 'contract-1',
        organisation_id: 'org-b',
        old_status: 'DRAFT',
        new_status: 'FINALIZED',
        updated_at: '2026-07-10T12:00:00.000Z',
        client_name: 'Zenith Exports',
      }),
    } as MessageEvent<string>);

    await waitFor(() => {
      expect(screen.getByTestId('realtime-version')).toHaveTextContent('1');
    });
    expect(screen.getByTestId('latest-event')).toHaveTextContent('contract.finalized');
  });

  it('updates persisted scope and cleans up EventSource listeners on unmount', async () => {
    getOrganisationsMock.mockResolvedValue(organisations);
    const user = userEvent.setup();

    const { unmount } = render(
      <OrganisationProvider>
        <Consumer />
      </OrganisationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-id')).toHaveTextContent('none');
    });

    await user.click(screen.getByRole('button', { name: 'Select Org B' }));

    await waitFor(() => {
      expect(localStorage.getItem('tractus.activeOrganisationId')).toBe('org-b');
    });
    await waitFor(() => {
      expect(FakeEventSource.instances).toHaveLength(1);
    });

    const source = FakeEventSource.instances[0];
    unmount();

    expect(source.removeEventListener).toHaveBeenCalledTimes(5);
    expect(source.close).toHaveBeenCalledTimes(1);
  });
});

