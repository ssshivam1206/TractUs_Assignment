'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { listContracts, toFriendlyApiError } from '@/lib/api';
import { getFriendlyApiErrorMessage } from '@/lib/error-copy';
import { useOrganisation } from '@/state/organisation-context';
import type { ContractApiObject, ContractListFilters, ContractStatus } from '@/types/contract';
import { SkeletonCard, SkeletonTableRows } from '@/components/ui-skeletons';

type ContractListState = {
  items: ContractApiObject[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS: Array<{ label: string; value: '' | ContractStatus }> = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Finalized', value: 'FINALIZED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getStatusTone(status: ContractStatus) {
  switch (status) {
    case 'DRAFT':
      return 'status-draft';
    case 'FINALIZED':
      return 'status-finalized';
    case 'ARCHIVED':
      return 'status-archived';
    default:
      return 'status-draft';
  }
}

function formatContractKey(contractId: string) {
  return contractId.slice(-8).toUpperCase();
}

function isEmptyFilters(filters: ContractListFilters) {
  return !filters.clientName && !filters.contractId && !filters.status;
}

function FilterField({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="grid gap-2 text-sm text-slate-600">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ContractCard({ contract }: { contract: ContractApiObject }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-md lg:hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{contract.client_name}</p>
            <p className="mt-1 text-xs text-slate-500">Ref {formatContractKey(contract.id)} - Updated {formatDateTime(contract.updated_at)}</p>
          </div>
          <span className={`status-pill ${getStatusTone(contract.status)}`}>{contract.status}</span>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm text-slate-600">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">PO ref</p>
            <p className="mt-1 font-medium text-slate-900">{contract.po_ref_no}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">PO date</p>
            <p className="mt-1 font-medium text-slate-900">{formatDateOnly(contract.po_date)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end px-5 pb-5">
        <Link href={`/contracts/${contract.id}`} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-50">
          Open details
        </Link>
      </div>
    </article>
  );
}

function ContractListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="hidden lg:block">
        <SkeletonTableRows rows={4} />
      </div>
    </div>
  );
}

export function ContractListPage({ organisationId }: { organisationId: string | null }) {
  const { realtimeVersion } = useOrganisation();
  const [filters, setFilters] = useState<ContractListFilters>({
    status: undefined,
    clientName: '',
    contractId: '',
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  });
  const [data, setData] = useState<ContractListState>({ items: [], page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestFilters = useMemo(
    () => ({
      status: filters.status,
      clientName: filters.clientName.trim() || undefined,
      contractId: filters.contractId.trim() || undefined,
      page: filters.page,
      limit: filters.limit,
    }),
    [filters],
  );

  useEffect(() => {
    if (!organisationId) {
      return;
    }

    let cancelled = false;

    async function loadContracts() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listContracts(organisationId, requestFilters);
        if (cancelled) {
          return;
        }

        setData({
          items: response.items,
          page: response.page,
          limit: response.limit,
          total: response.total,
          total_pages: response.total_pages,
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const friendlyError = toFriendlyApiError(loadError);
        setError(getFriendlyApiErrorMessage(friendlyError));
        setData({ items: [], page: 1, limit: requestFilters.limit ?? DEFAULT_PAGE_SIZE, total: 0, total_pages: 0 });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadContracts();

    return () => {
      cancelled = true;
    };
  }, [organisationId, requestFilters, realtimeVersion]);

  const handleTextFilterChange = (field: 'clientName' | 'contractId', value: string) => {
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  };

  const handleStatusChange = (value: '' | ContractStatus) => {
    setFilters((current) => ({ ...current, status: value || undefined, page: 1 }));
  };

  const hasSelection = Boolean(organisationId);
  const hasRows = data.items.length > 0;
  const selectedStatus = filters.status ?? '';
  const isInitialLoading = hasSelection && isLoading && data.items.length === 0;

  return (
    <section className="surface-strong reveal-up reveal-up-delay-1 overflow-hidden rounded-[2rem] border border-slate-200/80">
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Contracts</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Active contract register</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {hasSelection
                ? 'Search, filter, and paginate organisation-scoped contracts from the backend.'
                : 'Select an organisation to load its contract register.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {hasSelection ? (
              <Link href="/contracts/new" className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800">
                Create contract
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500">Select organisation first</span>
            )}

            <div className="premium-pill">
              {hasSelection ? (
                <>
                  <span className="text-slate-400">Total</span>
                  <span className="font-semibold text-slate-950">{data.total}</span>
                  <span>contract{data.total === 1 ? '' : 's'}</span>
                </>
              ) : (
                'No active scope'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 sm:px-6 lg:px-7">
        <div className="grid gap-3 xl:grid-cols-4">
          <FilterField label="Client name">
            <input type="search" value={filters.clientName} onChange={(event) => handleTextFilterChange('clientName', event.target.value)} placeholder="Search by client" disabled={!hasSelection} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
          </FilterField>

          <FilterField label="Contract id">
            <input type="search" value={filters.contractId} onChange={(event) => handleTextFilterChange('contractId', event.target.value)} placeholder="Search by id" disabled={!hasSelection} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
          </FilterField>

          <FilterField label="Status">
            <select value={selectedStatus} onChange={(event) => handleStatusChange(event.target.value as '' | ContractStatus)} disabled={!hasSelection} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-200 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100">
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Page size">
            <select value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: Number(event.target.value), page: 1 }))} disabled={!hasSelection} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-200 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100">
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </FilterField>
        </div>
      </div>

      <div className="bg-white">
        {isInitialLoading ? (
          <div className="px-5 py-6 sm:px-6 lg:px-7"><ContractListSkeleton /></div>
        ) : !hasSelection ? (
          <div className="px-5 py-12 sm:px-6 lg:px-7"><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm leading-6 text-slate-600">Select an organisation to load contracts for that workspace.</div></div>
        ) : error ? (
          <div className="px-5 py-8 sm:px-6 lg:px-7"><div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700"><p className="font-semibold text-rose-900">Could not load contracts</p><p className="mt-1">{error}</p></div></div>
        ) : !hasRows ? (
          <div className="px-5 py-12 sm:px-6 lg:px-7"><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><h3 className="text-base font-semibold text-slate-950">{isEmptyFilters(filters) ? 'No contracts yet' : 'No matching contracts'}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{isEmptyFilters(filters) ? 'This organisation does not have any contracts right now.' : 'Try changing the filters to widen the result set.'}</p></div></div>
        ) : (
          <div className="px-5 py-5 sm:px-6 lg:px-7">
            <div className="grid gap-4 lg:hidden">
              {data.items.map((contract) => <ContractCard key={contract.id} contract={contract} />)}
            </div>

            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                <div className="grid grid-cols-[1.15fr_0.8fr_0.8fr_0.72fr_0.9fr_0.65fr] gap-3 border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>Client</span>
                  <span>PO ref</span>
                  <span>PO date</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Action</span>
                </div>

                <div className="max-h-[38rem] overflow-auto">
                  {data.items.map((contract) => (
                    <div key={contract.id} className="grid grid-cols-[1.15fr_0.8fr_0.8fr_0.72fr_0.9fr_0.65fr] gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 transition duration-150 last:border-b-0 hover:bg-slate-50/70">
                      <div className="min-w-0">
                        <p className="truncate font-semibold tracking-tight text-slate-950">{contract.client_name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">Ref {formatContractKey(contract.id)}</p>
                      </div>
                      <span className="font-medium text-slate-900">{contract.po_ref_no}</span>
                      <span>{formatDateOnly(contract.po_date)}</span>
                      <span><span className={`status-pill ${getStatusTone(contract.status)}`}>{contract.status}</span></span>
                      <span className="text-slate-500">{formatDateTime(contract.updated_at)}</span>
                      <span><Link href={`/contracts/${contract.id}`} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50">Open</Link></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-7">
        <p className="text-sm text-slate-600">{hasSelection ? `Page ${data.page} of ${Math.max(data.total_pages, 1)}` : 'Select an organisation to unlock pagination.'}</p>

        <div className="flex items-center gap-2">
          <button type="button" disabled={!hasSelection || data.page <= 1 || isLoading} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <button type="button" disabled={!hasSelection || data.page >= data.total_pages || isLoading || data.total_pages === 0} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>
    </section>
  );
}

