'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { listContracts, toFriendlyApiError } from '@/lib/api';
import type { ContractApiObject, ContractListFilters, ContractStatus } from '@/types/contract';

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
      return 'bg-slate-200 text-slate-700';
    default:
      return 'status-draft';
  }
}

function isEmptyFilters(filters: ContractListFilters) {
  return !filters.clientName && !filters.contractId && !filters.status;
}

function FilterField({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <label className="grid gap-2 text-sm text-slate-600">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ContractListPage({ organisationId }: { organisationId: string | null }) {
  const [filters, setFilters] = useState<ContractListFilters>({
    status: undefined,
    clientName: '',
    contractId: '',
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  });
  const [data, setData] = useState<ContractListState>({
    items: [],
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
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
        setError(friendlyError.message);
        setData({
          items: [],
          page: 1,
          limit: requestFilters.limit ?? DEFAULT_PAGE_SIZE,
          total: 0,
          total_pages: 0,
        });
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
  }, [organisationId, requestFilters]);

  const handleTextFilterChange = (field: 'clientName' | 'contractId', value: string) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const handleStatusChange = (value: '' | ContractStatus) => {
    setFilters((current) => ({
      ...current,
      status: value || undefined,
      page: 1,
    }));
  };

  const hasSelection = Boolean(organisationId);
  const hasRows = data.items.length > 0;
  const selectedStatus = filters.status ?? '';

  return (
    <section className="surface-strong reveal-up reveal-up-delay-1 overflow-hidden rounded-[1.75rem]">
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Contract list</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Backend-driven search and pagination
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {hasSelection
                ? 'These results are scoped to the active organisation and reload whenever the filters change.'
                : 'Pick an organisation first to load its contracts from the backend.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 self-start sm:flex-row sm:items-center">
            {hasSelection ? (
              <Link
                href="/contracts/new"
                className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98]"
              >
                Create contract
              </Link>
            ) : (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-sm">
                Select organisation first
              </span>
            )}
            <div className="premium-pill self-start">
              {hasSelection ? (
                <>
                  <span className="text-slate-400">Total</span>
                  <span className="font-semibold text-slate-950">{data.total}</span>
                  <span>contract{data.total === 1 ? '' : 's'}</span>
                </>
              ) : (
                'No active organisation'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200/80 bg-slate-50/90 p-5 sm:p-6 xl:grid-cols-4">
        <FilterField label="Client name">
          <input
            type="search"
            value={filters.clientName}
            onChange={(event) => handleTextFilterChange('clientName', event.target.value)}
            placeholder="Search by client"
            disabled={!hasSelection}
            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </FilterField>

        <FilterField label="Contract id">
          <input
            type="search"
            value={filters.contractId}
            onChange={(event) => handleTextFilterChange('contractId', event.target.value)}
            placeholder="Search by id"
            disabled={!hasSelection}
            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </FilterField>

        <FilterField label="Status">
          <select
            value={selectedStatus}
            onChange={(event) => handleStatusChange(event.target.value as '' | ContractStatus)}
            disabled={!hasSelection}
            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Page size">
          <select
            value={filters.limit}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                limit: Number(event.target.value),
                page: 1,
              }))
            }
            disabled={!hasSelection}
            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {[5, 10, 20].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </FilterField>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="grid grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 border-b border-slate-200/80 bg-white px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">
          <span>Contract</span>
          <span>Client</span>
          <span>PO ref</span>
          <span>PO date</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {!hasSelection ? (
          <div className="px-5 py-10 text-sm leading-6 text-slate-600 sm:px-6">
            Select an organisation to load the contract list.
          </div>
        ) : isLoading ? (
          <div className="px-5 py-10 text-sm leading-6 text-slate-600 sm:px-6">
            Loading contracts from the backend...
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-sm leading-6 text-rose-600 sm:px-6">{error}</div>
        ) : !hasRows ? (
          <div className="px-5 py-10 text-sm leading-6 text-slate-600 sm:px-6">
            {isEmptyFilters(filters)
              ? 'No contracts found for this organisation yet.'
              : 'No contracts match the current filters.'}
          </div>
        ) : (
          data.items.map((contract) => (
            <div
              key={contract.id}
              className="row-surface grid grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50/70 sm:px-6"
            >
              <div>
                <p className="font-semibold tracking-tight text-slate-950">{contract.id}</p>
                <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(contract.updated_at)}</p>
              </div>
              <span className="font-medium text-slate-900">{contract.client_name}</span>
              <span>{contract.po_ref_no}</span>
              <span>{formatDateOnly(contract.po_date)}</span>
              <span>
                <span className={`status-pill ${getStatusTone(contract.status)}`}>{contract.status}</span>
              </span>
              <span>
                <Link
                  href={`/contracts/${contract.id}`}
                  className="inline-flex rounded-full bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98]"
                >
                  Open
                </Link>
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-slate-600">
          {hasSelection
            ? `Page ${data.page} of ${Math.max(data.total_pages, 1)}`
            : 'Select an organisation to see pagination.'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasSelection || data.page <= 1 || isLoading}
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasSelection || data.page >= data.total_pages || isLoading || data.total_pages === 0}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: current.page + 1,
              }))
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

