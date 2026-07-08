'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { archiveContract, finalizeContract, getContract, toFriendlyApiError, updateContract } from '@/lib/api';
import { OrganisationSelector } from '@/components/organisation-selector';
import { useOrganisation } from '@/state/organisation-context';
import type { ContractApiObject, ContractItem, ContractUpdateInput } from '@/types/contract';

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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
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

    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      issues.push(`items[${index}].quantity must be a number greater than 0.`);
    }

    if (item.quantity_unit !== undefined && !isNonEmptyString(item.quantity_unit)) {
      issues.push(`items[${index}].quantity_unit must be a non-empty string when provided.`);
    }

    if (typeof item.unit_price !== 'number' || !Number.isFinite(item.unit_price) || item.unit_price < 0) {
      issues.push(`items[${index}].unit_price must be a number greater than or equal to 0.`);
    }

    if (item.pricing_unit !== undefined && !isNonEmptyString(item.pricing_unit)) {
      issues.push(`items[${index}].pricing_unit must be a non-empty string when provided.`);
    }

    if (
      item.total !== undefined &&
      (typeof item.total !== 'number' || !Number.isFinite(item.total) || item.total < 0)
    ) {
      issues.push(`items[${index}].total must be a number greater than or equal to 0 when provided.`);
    }

    normalizedItems.push({
      description: String(item.description ?? '').trim(),
      quantity: Number(item.quantity),
      quantity_unit: item.quantity_unit === undefined ? undefined : String(item.quantity_unit).trim(),
      unit_price: Number(item.unit_price),
      pricing_unit: item.pricing_unit === undefined ? undefined : String(item.pricing_unit).trim(),
      total: item.total === undefined ? undefined : Number(item.total),
    });
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: normalizedItems };
}

function buildPatchPreview(initial: ContractApiObject, draft: ContractFormState): PatchPreviewResult {
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
function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const { activeOrganisation, activeOrganisationId, isLoading } = useOrganisation();
  const [contract, setContract] = useState<ContractApiObject | null>(null);
  const [draft, setDraft] = useState<ContractFormState | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<'finalize' | 'archive' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrganisationId) {
      return;
    }

    let cancelled = false;

    async function loadContract() {
      setIsLoadingContract(true);
      setError(null);
      setNotice(null);
      setIsEditing(false);
      setWorkflowAction(null);

      try {
        const nextContract = await getContract(activeOrganisationId, contractId);
        if (cancelled) {
          return;
        }

        setContract(nextContract);
        setDraft(createFormState(nextContract));
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const friendlyError = toFriendlyApiError(loadError);
        setError(friendlyError.message);
        setContract(null);
        setDraft(null);
      } finally {
        if (!cancelled) {
          setIsLoadingContract(false);
        }
      }
    }

    void loadContract();

    return () => {
      cancelled = true;
    };
  }, [activeOrganisationId, contractId]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
  const title = contract ? `Contract ${contract.id}` : `Contract ${contractId}`;
  const activeScopeLabel = activeOrganisation?.name ?? 'No organisation selected';
  const statusLabel = contract?.status ?? 'Loading';
  const statusToneClass =
    contract?.status === 'DRAFT'
      ? 'status-draft'
      : contract?.status === 'FINALIZED'
        ? 'status-finalized'
        : 'bg-slate-100 text-slate-600';
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
      setError(friendlyError.message);
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
      const updated = await updateContract(activeOrganisationId, contractId, patchPreview.payload);
      setContract(updated);
      setDraft(createFormState(updated));
      setIsEditing(false);
      setNotice('Contract saved successfully.');
    } catch (saveError) {
      const friendlyError = toFriendlyApiError(saveError);
      setError(friendlyError.message);
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

  const handleRefresh = async () => {
    if (!activeOrganisationId) {
      return;
    }

    setIsLoadingContract(true);
    setError(null);
    setNotice(null);
    setIsEditing(false);

    try {
      const nextContract = await getContract(activeOrganisationId, contractId);
      setContract(nextContract);
      setDraft(createFormState(nextContract));
    } catch (loadError) {
      const friendlyError = toFriendlyApiError(loadError);
      setError(friendlyError.message);
      setContract(null);
      setDraft(null);
    } finally {
      setIsLoadingContract(false);
    }
  };

  return (
    <main className="app-shell min-h-[100dvh] text-slate-950">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="surface-strong reveal-up overflow-hidden rounded-[2rem]">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))] p-6 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="section-kicker">Contract detail</p>
                  <span className={`status-pill ${statusToneClass}`}>{statusLabel}</span>
                  <span className="premium-pill">{workflowLabel}</span>
                </div>
                <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[0.96]">
                  {title}
                </h1>
                <p className="section-copy mt-4 max-w-2xl">
                  A focused view for reviewing the server snapshot, editing draft fields with a
                  partial PATCH, and moving the contract through its lifecycle without extra page
                  noise.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/" className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]">Back to dashboard</Link>
                {activeOrganisationId ? (<button type="button" onClick={() => void handleRefresh()} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]">Refresh</button>) : null}
                {canFinalize ? (<button type="button" disabled={isWorkflowBusy} onClick={() => void handleWorkflowAction('finalize')} className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{workflowAction === 'finalize' ? 'Finalizing...' : 'Finalize'}</button>) : null}
                {canArchive ? (<button type="button" disabled={isWorkflowBusy} onClick={() => void handleWorkflowAction('archive')} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{workflowAction === 'archive' ? 'Archiving...' : 'Archive'}</button>) : null}
                {canEdit ? (<button type="button" onClick={() => setIsEditing((current) => !current)} className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98]">{isEditing ? 'View mode' : 'Edit draft'}</button>) : null}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryRow label="Organisation" value={activeScopeLabel} />
              <SummaryRow label="Scope" value={activeOrganisationId ?? 'No scope'} />
              <SummaryRow label="Status" value={statusLabel} />
              <SummaryRow label="Editing" value={workflowLabel} />
            </div>
          </div>

          <div className="p-6 sm:p-7 lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <section className="space-y-6">
                <OrganisationSelector />
                {hasActiveScope && notice ? (<div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{notice}</div>) : null}
                {hasActiveScope && error ? (<div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</div>) : null}
                <div className="surface reveal-up reveal-up-delay-1 rounded-[1.75rem] p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="section-kicker">Contract data</p>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Client fields and line items</h2>
                    </div>
                    <span className="premium-pill self-start sm:self-auto">{loadingState ? 'Loading' : statusLabel}</span>
                  </div>
                  {!hasActiveScope ? (<div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Select an organisation in the dashboard to load this contract.</div>) : loadingState ? (<div className="mt-6 space-y-3 text-sm leading-6 text-slate-600"><p>Loading the contract from the backend...</p><p>We are keeping the organisation scope in sync while this happens.</p></div>) : contract ? (
                    <div className="mt-6 grid gap-5">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryRow label="Client" value={contract.field_data.client_name} />
                        <SummaryRow label="PO reference" value={contract.field_data.po_ref_no} />
                        <SummaryRow label="PO date" value={contract.field_data.po_date} />
                        <SummaryRow label="Estimated total" value={formatCurrency(estimateContractTotal(contract.field_data.items))} />
                      </div>

                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
                        <div className="space-y-4">
                          {isEditing && canEdit && draft ? (
                            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 sm:p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Draft editor</p>
                                  <p className="mt-1 text-sm leading-6 text-slate-600">Update only the fields you want to change. Unchanged fields stay on the server snapshot.</p>
                                </div>
                                <span className="premium-pill">Partial PATCH</span>
                              </div>
                              <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Client name</span><input type="text" value={draft.client_name} onChange={(event) => setDraft((current) => current ? { ...current, client_name: event.target.value } : current)} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">PO reference</span><input type="text" value={draft.po_ref_no} onChange={(event) => setDraft((current) => current ? { ...current, po_ref_no: event.target.value } : current)} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                                <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">PO date</span><input type="date" value={draft.po_date} onChange={(event) => setDraft((current) => current ? { ...current, po_date: event.target.value } : current)} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Payment terms</span><input type="text" value={draft.payment_terms} onChange={(event) => setDraft((current) => current ? { ...current, payment_terms: event.target.value } : current)} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                                <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery terms</span><input type="text" value={draft.delivery_terms} onChange={(event) => setDraft((current) => current ? { ...current, delivery_terms: event.target.value } : current)} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                              </div>
                              <label className="grid gap-2 text-sm text-slate-600"><span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Items JSON</span><textarea value={draft.itemsJson} onChange={(event) => setDraft((current) => current ? { ...current, itemsJson: event.target.value } : current)} spellCheck={false} className="min-h-[20rem] rounded-[1rem] border border-slate-200 bg-white px-4 py-4 font-mono text-[0.85rem] leading-6 text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400" /></label>
                            </div>
                          ) : (
                            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 sm:p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Snapshot</p><p className="mt-1 text-sm leading-6 text-slate-600">Server-confirmed contract fields and values.</p></div><span className="premium-pill">Read only</span></div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <SummaryRow label="Client name" value={contract.field_data.client_name} />
                                <SummaryRow label="PO reference" value={contract.field_data.po_ref_no} />
                                <SummaryRow label="PO date" value={contract.field_data.po_date} />
                                <SummaryRow label="Payment terms" value={contract.field_data.payment_terms ?? 'Not set'} />
                                <SummaryRow label="Delivery terms" value={contract.field_data.delivery_terms ?? 'Not set'} />
                                <SummaryRow label="Line items" value={String(contract.field_data.items.length)} />
                              </div>
                            </div>
                          )}

                          {canEdit && isEditing ? (
                            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 sm:p-5">
                              <div className="flex flex-wrap gap-3">
                                <button type="button" disabled={isSaving || !patchPreview?.ok || !patchPreview.hasChanges} onClick={() => void handleSave()} className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Saving...' : 'Save changes'}</button>
                                <button type="button" disabled={isSaving} onClick={handleDiscard} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">Discard changes</button>
                              </div>
                              <p className="text-sm leading-6 text-slate-500">{patchPreview && patchPreview.ok && !patchPreview.hasChanges ? 'No changes detected yet.' : 'Only changed fields will be sent to the backend.'}</p>
                            </div>
                          ) : null}

                          {!canEdit ? (<div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Editing is disabled because this contract is {contract.status}. Only draft contracts can be updated.</div>) : null}
                          {contract.status === 'ARCHIVED' ? (<div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Archived contracts are locked. Finalize and archive actions are disabled for this state.</div>) : null}
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3"><div><p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Contract JSON</p><p className="mt-1 text-sm leading-6 text-slate-600">The exact payload returned by the backend.</p></div><span className="premium-pill">{contract.field_data.items.length} items</span></div>
                            <pre className="mt-3 max-h-[22rem] overflow-auto rounded-[1rem] border border-slate-200 bg-white p-4 text-[0.8rem] leading-6 text-slate-700">{contractJson}</pre>
                          </div>

                          <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</p>
                            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                              <p className="flex items-center justify-between gap-3"><span>Created</span><span className="font-semibold text-slate-950">{formatDateTime(contract.created_at)}</span></p>
                              <p className="flex items-center justify-between gap-3"><span>Updated</span><span className="font-semibold text-slate-950">{formatDateTime(contract.updated_at)}</span></p>
                              <p className="flex items-center justify-between gap-3"><span>Finalized</span><span className="font-semibold text-slate-950">{contract.finalized_at ? formatDateTime(contract.finalized_at) : 'Not finalized'}</span></p>
                              <p className="flex items-center justify-between gap-3"><span>Archived</span><span className="font-semibold text-slate-950">{contract.archived_at ? formatDateTime(contract.archived_at) : 'Not archived'}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">{activeOrganisationId ? 'We could not load this contract. Check the organisation scope and try again.' : 'Select an organisation in the dashboard to load this contract.'}</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
