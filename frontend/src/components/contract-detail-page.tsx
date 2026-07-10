'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  archiveContract,
  finalizeContract,
  getContract,
  getContractEvents,
  toFriendlyApiError,
  updateContract,
} from '@/lib/api';
import { getFriendlyApiErrorMessage } from '@/lib/error-copy';
import { SkeletonCard } from '@/components/ui-skeletons';
import { ContractAuditTrail } from '@/components/contract-audit-trail';
import { OrganisationSelector } from '@/components/organisation-selector';
import { useOrganisation } from '@/state/organisation-context';
import type {
  ContractApiObject,
  ContractAuditEvent,
  ContractItem,
  ContractUpdateInput,
} from '@/types/contract';

type ContractFormState = {
  client_name: string;
  po_ref_no: string;
  po_date: string;
  payment_terms: string;
  delivery_terms: string;
  itemsJson: string;
};

type ItemsValidationResult =
  | {
      ok: true;
      value: ContractItem[];
    }
  | {
      ok: false;
      issues: string[];
    };

type PatchPreviewResult =
  | {
      ok: true;
      payload: ContractUpdateInput;
      hasChanges: boolean;
    }
  | {
      ok: false;
      issues: string[];
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function estimateContractTotal(items: ContractItem[]) {
  return items.reduce((sum, item) => {
    if (typeof item.total === 'number' && Number.isFinite(item.total)) {
      return sum + item.total;
    }

    return sum + item.quantity * item.unit_price;
  }, 0);
}

function createFormState(contract: ContractApiObject): ContractFormState {
  return {
    client_name: contract.field_data.client_name,
    po_ref_no: contract.field_data.po_ref_no,
    po_date: contract.field_data.po_date,
    payment_terms: contract.field_data.payment_terms ?? '',
    delivery_terms: contract.field_data.delivery_terms ?? '',
    itemsJson: JSON.stringify(contract.field_data.items, null, 2),
  };
}

function validateItemsJson(rawValue: string): ItemsValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return { ok: false, issues: ['items must be valid JSON.'] };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, issues: ['items must be a non-empty array.'] };
  }

  const issues: string[] = [];
  const normalizedItems: ContractItem[] = [];

  parsed.forEach((item, index) => {
    if (!isPlainObject(item)) {
      issues.push(`items[${index}] must be an object.`);
      return;
    }

    if (!isNonEmptyString(item.description)) {
      issues.push(`items[${index}].description is required.`);
    }

    if (
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      issues.push(`items[${index}].quantity must be a number greater than 0.`);
    }

    if (
      item.quantity_unit !== undefined &&
      !isNonEmptyString(item.quantity_unit)
    ) {
      issues.push(
        `items[${index}].quantity_unit must be a non-empty string when provided.`,
      );
    }

    if (
      typeof item.unit_price !== 'number' ||
      !Number.isFinite(item.unit_price) ||
      item.unit_price < 0
    ) {
      issues.push(
        `items[${index}].unit_price must be a number greater than or equal to 0.`,
      );
    }

    if (
      item.pricing_unit !== undefined &&
      !isNonEmptyString(item.pricing_unit)
    ) {
      issues.push(
        `items[${index}].pricing_unit must be a non-empty string when provided.`,
      );
    }

    if (
      item.total !== undefined &&
      (typeof item.total !== 'number' ||
        !Number.isFinite(item.total) ||
        item.total < 0)
    ) {
      issues.push(
        `items[${index}].total must be a number greater than or equal to 0 when provided.`,
      );
    }

    normalizedItems.push({
      description: String(item.description ?? '').trim(),
      quantity: Number(item.quantity),
      quantity_unit:
        item.quantity_unit === undefined
          ? undefined
          : String(item.quantity_unit).trim(),
      unit_price: Number(item.unit_price),
      pricing_unit:
        item.pricing_unit === undefined
          ? undefined
          : String(item.pricing_unit).trim(),
      total: item.total === undefined ? undefined : Number(item.total),
    });
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: normalizedItems };
}

function buildPatchPreview(
  initial: ContractApiObject,
  draft: ContractFormState,
): PatchPreviewResult {
  const issues: string[] = [];
  const payload: ContractUpdateInput = {};
  const nextClientName = draft.client_name.trim();
  const nextPoRefNo = draft.po_ref_no.trim();
  const nextPoDate = draft.po_date.trim();
  const nextPaymentTerms = draft.payment_terms.trim();
  const nextDeliveryTerms = draft.delivery_terms.trim();

  if (nextClientName !== initial.field_data.client_name) {
    if (!nextClientName) {
      issues.push('client_name cannot be empty.');
    } else {
      payload.client_name = nextClientName;
    }
  }

  if (nextPoRefNo !== initial.field_data.po_ref_no) {
    if (!nextPoRefNo) {
      issues.push('po_ref_no cannot be empty.');
    } else {
      payload.po_ref_no = nextPoRefNo;
    }
  }

  if (nextPoDate !== initial.field_data.po_date) {
    if (!nextPoDate) {
      issues.push('po_date cannot be empty.');
    } else if (!isValidIsoDate(nextPoDate)) {
      issues.push('po_date must use the YYYY-MM-DD format.');
    } else {
      payload.po_date = nextPoDate;
    }
  }

  if (nextPaymentTerms !== (initial.field_data.payment_terms ?? '')) {
    if (!nextPaymentTerms) {
      issues.push('payment_terms cannot be cleared in this flow.');
    } else {
      payload.payment_terms = nextPaymentTerms;
    }
  }

  if (nextDeliveryTerms !== (initial.field_data.delivery_terms ?? '')) {
    if (!nextDeliveryTerms) {
      issues.push('delivery_terms cannot be cleared in this flow.');
    } else {
      payload.delivery_terms = nextDeliveryTerms;
    }
  }

  const itemsResult = validateItemsJson(draft.itemsJson);
  if (!itemsResult.ok) {
    issues.push(...itemsResult.issues);
  } else {
    const currentItems = JSON.stringify(itemsResult.value);
    const originalItems = JSON.stringify(initial.field_data.items);
    if (currentItems !== originalItems) {
      payload.items = itemsResult.value;
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    payload,
    hasChanges: Object.keys(payload).length > 0,
  };
}

function SummaryRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/50">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function getItemTotal(item: ContractItem) {
  if (typeof item.total === 'number' && Number.isFinite(item.total)) {
    return item.total;
  }

  return item.quantity * item.unit_price;
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const {
    activeOrganisation,
    activeOrganisationId,
    isLoading,
    latestContractEvent,
  } = useOrganisation();
  const [contract, setContract] = useState<ContractApiObject | null>(null);
  const [draft, setDraft] = useState<ContractFormState | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<
    'finalize' | 'archive' | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [auditEvents, setAuditEvents] = useState<ContractAuditEvent[]>([]);
  const [isLoadingAuditTrail, setIsLoadingAuditTrail] = useState(true);
  const [auditTrailError, setAuditTrailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshContract = useCallback(async () => {
    if (!activeOrganisationId) {
      return;
    }

    setIsLoadingContract(true);
    setError(null);
    setNotice(null);
    setIsEditing(false);
    setWorkflowAction(null);

    try {
      const nextContract = await getContract(activeOrganisationId, contractId);
      setContract(nextContract);
      setDraft(createFormState(nextContract));
    } catch (loadError) {
      const friendlyError = toFriendlyApiError(loadError);
      setError(getFriendlyApiErrorMessage(friendlyError));
      setContract(null);
      setDraft(null);
    } finally {
      setIsLoadingContract(false);
    }
  }, [activeOrganisationId, contractId]);

  const refreshAuditTrail = useCallback(async () => {
    if (!activeOrganisationId) {
      return;
    }

    setIsLoadingAuditTrail(true);
    setAuditTrailError(null);

    try {
      const nextEvents = await getContractEvents(
        activeOrganisationId,
        contractId,
      );
      setAuditEvents(nextEvents);
    } catch (loadError) {
      const friendlyError = toFriendlyApiError(loadError);
      setAuditTrailError(getFriendlyApiErrorMessage(friendlyError));
      setAuditEvents([]);
    } finally {
      setIsLoadingAuditTrail(false);
    }
  }, [activeOrganisationId, contractId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshContract();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshContract]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAuditTrail();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshAuditTrail]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (
      !latestContractEvent ||
      latestContractEvent.organisation_id !== activeOrganisationId ||
      latestContractEvent.contract_id !== contractId
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshContract();
      void refreshAuditTrail();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    activeOrganisationId,
    contractId,
    latestContractEvent,
    refreshAuditTrail,
    refreshContract,
  ]);

  const canEdit = contract?.status === 'DRAFT';
  const patchPreview = useMemo(() => {
    if (!contract || !draft) {
      return null;
    }

    return buildPatchPreview(contract, draft);
  }, [contract, draft]);

  const contractJson = useMemo(() => {
    if (!contract) {
      return '';
    }

    return JSON.stringify(contract.field_data, null, 2);
  }, [contract]);

  const canFinalize = contract?.status === 'DRAFT';
  const canArchive = contract?.status === 'FINALIZED';
  const isWorkflowBusy = workflowAction !== null;
  const hasActiveScope = Boolean(activeOrganisationId);
  const loadingState = hasActiveScope && (isLoading || isLoadingContract);
  const title = contract?.client_name ?? 'Contract record';
  const contractReference = contract?.id ?? contractId;
  const activeScopeLabel =
    activeOrganisation?.name ?? 'No organisation selected';
  const statusLabel = contract?.status ?? 'Loading';
  const statusToneClass =
    contract?.status === 'DRAFT'
      ? 'status-draft'
      : contract?.status === 'FINALIZED'
        ? 'status-finalized'
        : 'status-archived';
  const workflowLabel = contract
    ? contract.status === 'DRAFT'
      ? 'Draft editable'
      : contract.status === 'FINALIZED'
        ? 'Ready to archive'
        : 'Locked'
    : 'Loading';

  async function handleWorkflowAction(action: 'finalize' | 'archive') {
    if (!contract || !activeOrganisationId) {
      return;
    }

    const confirmed = window.confirm(
      action === 'finalize'
        ? 'Finalize this draft contract? This will lock the draft editing flow.'
        : 'Archive this finalized contract? This action moves the contract to archived state.',
    );

    if (!confirmed) {
      return;
    }

    setWorkflowAction(action);
    setError(null);
    setNotice(null);

    try {
      const updated =
        action === 'finalize'
          ? await finalizeContract(activeOrganisationId, contract.id)
          : await archiveContract(activeOrganisationId, contract.id);

      setContract(updated);
      setDraft(createFormState(updated));
      setIsEditing(false);
      setNotice(`Contract ${action}d successfully.`);
    } catch (workflowError) {
      const friendlyError = toFriendlyApiError(workflowError);
      setError(getFriendlyApiErrorMessage(friendlyError));
    } finally {
      setWorkflowAction(null);
    }
  }

  const handleSave = async () => {
    if (!contract || !draft || !activeOrganisationId || !patchPreview) {
      return;
    }

    if (!patchPreview.ok) {
      setError(patchPreview.issues[0] ?? 'Fix the draft before saving.');
      setNotice(null);
      return;
    }

    if (!patchPreview.hasChanges) {
      setError('Make at least one change before saving.');
      setNotice(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateContract(
        activeOrganisationId,
        contractId,
        patchPreview.payload,
      );
      setContract(updated);
      setDraft(createFormState(updated));
      setIsEditing(false);
      setNotice('Contract saved successfully.');
    } catch (saveError) {
      const friendlyError = toFriendlyApiError(saveError);
      setError(getFriendlyApiErrorMessage(friendlyError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!contract) {
      return;
    }

    setDraft(createFormState(contract));
    setError(null);
    setNotice('Unsaved changes discarded.');
    setIsEditing(false);
  };

  return (
    <main className="app-shell min-h-[100dvh] text-slate-950">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="surface-strong reveal-up overflow-hidden rounded-[2rem]">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.95))] p-6 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="section-kicker">Contract record</p>
                  <span className={`status-pill ${statusToneClass}`}>
                    {statusLabel}
                  </span>
                  <span className="premium-pill">{workflowLabel}</span>
                  <span className="premium-pill">
                    Ref {contractReference.slice(-8).toUpperCase()}
                  </span>
                </div>
                <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[0.96]">
                  {title}
                </h1>
                <p className="section-copy mt-4 max-w-2xl">
                  Review the current contract, update draft fields when allowed,
                  and follow the lifecycle history without losing context.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
                >
                  Back to dashboard
                </Link>
                {activeOrganisationId ? (
                  <button
                    type="button"
                    onClick={() => void refreshContract()}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Refresh
                  </button>
                ) : null}
                {canFinalize ? (
                  <button
                    type="button"
                    disabled={isWorkflowBusy}
                    onClick={() => void handleWorkflowAction('finalize')}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {workflowAction === 'finalize'
                      ? 'Finalizing...'
                      : 'Finalize'}
                  </button>
                ) : null}
                {canArchive ? (
                  <button
                    type="button"
                    disabled={isWorkflowBusy}
                    onClick={() => void handleWorkflowAction('archive')}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {workflowAction === 'archive' ? 'Archiving...' : 'Archive'}
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing((current) => !current)}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98]"
                  >
                    {isEditing ? 'View mode' : 'Edit draft'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryRow label="Organisation" value={activeScopeLabel} />
              <SummaryRow
                label="Scope"
                value={activeOrganisationId ?? 'No scope'}
              />
              <SummaryRow label="Status" value={statusLabel} />
              <SummaryRow
                label="Last sync"
                value={
                  contract
                    ? formatDateLabel(contract.updated_at)
                    : 'Waiting for data'
                }
              />
            </div>
          </div>

          <div className="p-6 sm:p-7 lg:p-8">
            <div className="space-y-6">
              <OrganisationSelector />
              {hasActiveScope && notice ? (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                  {notice}
                </div>
              ) : null}
              {hasActiveScope && error ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="surface reveal-up reveal-up-delay-1 rounded-[1.75rem] p-5 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="section-kicker">Contract workspace</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                      Commercial data, operational state, and line items
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      The contract data now uses the full page width so the
                      commercial fields, workflow state, and audit history stay
                      readable together.
                    </p>
                  </div>
                  <span className="premium-pill self-start sm:self-auto">
                    {loadingState
                      ? 'Loading'
                      : `${contract?.field_data.items.length ?? 0} items`}
                  </span>
                </div>

                {!hasActiveScope ? (
                  <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                    Select an organisation in the dashboard to load this
                    contract.
                  </div>
                ) : loadingState ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <SkeletonCard className="min-h-[7.5rem]" />
                      <SkeletonCard className="min-h-[7.5rem]" />
                      <SkeletonCard className="min-h-[7.5rem]" />
                      <SkeletonCard className="min-h-[7.5rem]" />
                      <SkeletonCard className="min-h-[7.5rem]" />
                    </div>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                      <div className="space-y-5">
                        <SkeletonCard className="min-h-[20rem]" />
                        <SkeletonCard className="min-h-[18rem]" />
                      </div>
                      <div className="space-y-5">
                        <SkeletonCard className="min-h-[14rem]" />
                        <SkeletonCard className="min-h-[22rem]" />
                      </div>
                    </div>
                    <ContractAuditTrail
                      events={[]}
                      isLoading={true}
                      error={null}
                    />
                  </div>
                ) : contract ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <SummaryRow
                        label="Client"
                        value={contract.field_data.client_name}
                      />
                      <SummaryRow
                        label="PO reference"
                        value={contract.field_data.po_ref_no}
                      />
                      <SummaryRow
                        label="PO date"
                        value={contract.field_data.po_date}
                      />
                      <SummaryRow
                        label="Estimated total"
                        value={formatCurrency(
                          estimateContractTotal(contract.field_data.items),
                        )}
                      />
                      <SummaryRow
                        label="Line items"
                        value={String(contract.field_data.items.length)}
                      />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
                      <div className="space-y-5">
                        {isEditing && canEdit && draft ? (
                          <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/50 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="section-kicker">Draft editor</p>
                                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                                  Edit commercial fields and payload data
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  This editor keeps the existing partial PATCH
                                  behavior. Only changed values are sent back to
                                  the backend.
                                </p>
                              </div>
                              <span className="premium-pill self-start sm:self-auto">
                                Partial PATCH
                              </span>
                            </div>

                            <div className="mt-6 grid gap-4">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Client name
                                </span>
                                <input
                                  type="text"
                                  value={draft.client_name}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            client_name: event.target.value,
                                          }
                                        : current,
                                    )
                                  }
                                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                />
                              </label>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm text-slate-600">
                                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    PO reference
                                  </span>
                                  <input
                                    type="text"
                                    value={draft.po_ref_no}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              po_ref_no: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                  />
                                </label>
                                <label className="grid gap-2 text-sm text-slate-600">
                                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    PO date
                                  </span>
                                  <input
                                    type="date"
                                    value={draft.po_date}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              po_date: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                  />
                                </label>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm text-slate-600">
                                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Payment terms
                                  </span>
                                  <input
                                    type="text"
                                    value={draft.payment_terms}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              payment_terms: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                  />
                                </label>
                                <label className="grid gap-2 text-sm text-slate-600">
                                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Delivery terms
                                  </span>
                                  <input
                                    type="text"
                                    value={draft.delivery_terms}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              delivery_terms:
                                                event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                  />
                                </label>
                              </div>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Items JSON
                                </span>
                                <textarea
                                  value={draft.itemsJson}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            itemsJson: event.target.value,
                                          }
                                        : current,
                                    )
                                  }
                                  spellCheck={false}
                                  className="min-h-[20rem] rounded-[1rem] border border-slate-200 bg-white px-4 py-4 font-mono text-[0.85rem] leading-6 text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400"
                                />
                              </label>
                            </div>

                            {!patchPreview?.ok ? (
                              <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-4">
                                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                  Validation details
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                                  {patchPreview.issues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/50 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="section-kicker">Contract data</p>
                                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                                  Commercial snapshot at a glance
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  Server-confirmed values stay grouped together
                                  so the user can review commercial data without
                                  scanning a narrow sidebar.
                                </p>
                              </div>
                              <span className="premium-pill self-start whitespace-nowrap sm:self-auto">
                                Read only
                              </span>
                            </div>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              <SummaryRow
                                label="Client name"
                                value={contract.field_data.client_name}
                              />
                              <SummaryRow
                                label="PO reference"
                                value={contract.field_data.po_ref_no}
                              />
                              <SummaryRow
                                label="PO date"
                                value={contract.field_data.po_date}
                              />
                              <SummaryRow
                                label="Payment terms"
                                value={
                                  contract.field_data.payment_terms ?? 'Not set'
                                }
                              />
                              <SummaryRow
                                label="Delivery terms"
                                value={
                                  contract.field_data.delivery_terms ??
                                  'Not set'
                                }
                              />
                              <SummaryRow
                                label="Current status"
                                value={contract.status}
                              />
                            </div>
                          </div>
                        )}

                        {canEdit && isEditing ? (
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 px-5 py-5 text-white shadow-sm shadow-slate-900/10 sm:px-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                  Save controls
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                  {patchPreview &&
                                  patchPreview.ok &&
                                  !patchPreview.hasChanges
                                    ? 'No changes detected yet.'
                                    : 'Only changed fields will be sent to the backend.'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  disabled={
                                    isSaving ||
                                    !patchPreview?.ok ||
                                    !patchPreview.hasChanges
                                  }
                                  onClick={() => void handleSave()}
                                  className="inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? 'Saving...' : 'Save changes'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={handleDiscard}
                                  className="inline-flex rounded-full border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Discard changes
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/50 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="section-kicker">Line items</p>
                              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                                Commercial breakdown
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                Item details are surfaced in a proper table on
                                desktop and stacked cards on smaller screens.
                              </p>
                            </div>
                            <span className="premium-pill self-start whitespace-nowrap sm:self-auto">
                              {formatCurrency(
                                estimateContractTotal(
                                  contract.field_data.items,
                                ),
                              )}{' '}
                              total
                            </span>
                          </div>

                          <div className="mt-6 hidden overflow-hidden rounded-[1.3rem] border border-slate-200 lg:block">
                            <table className="min-w-full divide-y divide-slate-200 text-left">
                              <thead className="bg-slate-50/90">
                                <tr>
                                  <th className="px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Description
                                  </th>
                                  <th className="px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Quantity
                                  </th>
                                  <th className="px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Unit price
                                  </th>
                                  <th className="px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {contract.field_data.items.map(
                                  (item, index) => (
                                    <tr
                                      key={`${item.description}-${index}`}
                                      className="row-surface align-top"
                                    >
                                      <td className="px-4 py-4 text-sm font-medium leading-6 text-slate-950">
                                        {item.description}
                                      </td>
                                      <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                                        {item.quantity}{' '}
                                        {item.quantity_unit ?? ''}
                                      </td>
                                      <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                                        {formatCurrency(item.unit_price)}
                                        {item.pricing_unit
                                          ? ` / ${item.pricing_unit}`
                                          : ''}
                                      </td>
                                      <td className="px-4 py-4 text-sm font-semibold leading-6 text-slate-950">
                                        {formatCurrency(getItemTotal(item))}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-6 grid gap-3 lg:hidden">
                            {contract.field_data.items.map((item, index) => (
                              <div
                                key={`${item.description}-${index}`}
                                className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4"
                              >
                                <p className="text-sm font-semibold leading-6 text-slate-950">
                                  {item.description}
                                </p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  <SummaryRow
                                    label="Quantity"
                                    value={`${item.quantity} ${item.quantity_unit ?? ''}`.trim()}
                                  />
                                  <SummaryRow
                                    label="Unit price"
                                    value={`${formatCurrency(item.unit_price)}${item.pricing_unit ? ` / ${item.pricing_unit}` : ''}`}
                                  />
                                  <SummaryRow
                                    label="Total"
                                    value={formatCurrency(getItemTotal(item))}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!canEdit ? (
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
                            Editing is disabled because this contract is{' '}
                            {contract.status}. Only draft contracts can be
                            updated.
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/50 sm:p-6">
                          <div>
                            <p className="section-kicker">Workflow status</p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                              Operational readiness and timestamps
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              This side panel keeps the lifecycle notes and
                              server timestamps together instead of splitting
                              them into disconnected cards.
                            </p>
                          </div>

                          <div className="mt-6 space-y-3">
                            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Current stage
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`status-pill ${statusToneClass}`}
                                >
                                  {contract.status}
                                </span>
                                <span className="premium-pill">
                                  {workflowLabel}
                                </span>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                              <SummaryRow
                                label="Created"
                                value={formatDateLabel(contract.created_at)}
                              />
                              <SummaryRow
                                label="Last updated"
                                value={formatDateLabel(contract.updated_at)}
                              />
                              <SummaryRow
                                label="Finalized"
                                value={formatDateLabel(contract.finalized_at)}
                              />
                              <SummaryRow
                                label="Archived"
                                value={formatDateLabel(contract.archived_at)}
                              />
                            </div>
                            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Workflow notes
                              </p>
                              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                                <li>
                                  Draft contracts can be edited and finalized.
                                </li>
                                <li>
                                  Finalized contracts can move to archived after
                                  confirmation.
                                </li>
                                <li>
                                  Archived contracts stay locked for both
                                  editing and further workflow actions.
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/50 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="section-kicker">Contract JSON</p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                              Backend payload snapshot
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              The raw payload stays available for debugging, but
                              it no longer takes over the primary reading area.
                            </p>
                          </div>
                          <span className="premium-pill self-start whitespace-nowrap sm:self-auto">
                            {contract.field_data.items.length} items
                          </span>
                        </div>
                        <pre className="mt-6 max-h-[30rem] overflow-auto rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4 text-[0.8rem] leading-6 text-slate-700">
                          {contractJson}
                        </pre>
                      </div>
                    </div>

                    <ContractAuditTrail
                      events={auditEvents}
                      isLoading={isLoadingAuditTrail}
                      error={auditTrailError}
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                    {activeOrganisationId
                      ? 'We could not load this contract. Check the organisation scope and try again.'
                      : 'Select an organisation in the dashboard to load this contract.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
