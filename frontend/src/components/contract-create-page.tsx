'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContract, toFriendlyApiError } from '@/lib/api';
import { useOrganisation } from '@/state/organisation-context';
import type { ContractCreateInput } from '@/types/contract';

const SAMPLE_CONTRACT: ContractCreateInput = {
  client_name: 'Acme Trading Private',
  po_ref_no: 'PO-1002',
  po_date: '2026-07-07',
  payment_terms: 'Net 30',
  delivery_terms: 'Delivery within 5 business days',
  items: [
    {
      description: 'Steel bolts',
      quantity: 1200,
      quantity_unit: 'pcs',
      unit_price: 2.5,
      pricing_unit: 'per piece',
      total: 3000,
    },
    {
      description: 'Packaging crate',
      quantity: 18,
      quantity_unit: 'units',
      unit_price: 45,
      pricing_unit: 'per unit',
      total: 810,
    },
  ],
};

const SAMPLE_CONTRACT_JSON = JSON.stringify(SAMPLE_CONTRACT, null, 2);

type DraftValidationResult =
  | {
      ok: true;
      value: ContractCreateInput;
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

function isValidIsoDate(value: string): boolean {
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

function validateContractDraft(rawText: string): DraftValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      issues: ['The JSON is not valid. Check commas, brackets, and quotation marks.'],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      issues: ['The top-level JSON value must be an object.'],
    };
  }

  const issues: string[] = [];

  if (!isNonEmptyString(parsed.client_name)) {
    issues.push('client_name is required and must be a non-empty string.');
  }

  if (!isNonEmptyString(parsed.po_ref_no)) {
    issues.push('po_ref_no is required and must be a non-empty string.');
  }

  if (!isNonEmptyString(parsed.po_date)) {
    issues.push('po_date is required and must be a non-empty string.');
  } else if (!isValidIsoDate(parsed.po_date)) {
    issues.push('po_date must use the YYYY-MM-DD format.');
  }

  if (parsed.payment_terms !== undefined && !isNonEmptyString(parsed.payment_terms)) {
    issues.push('payment_terms must be a non-empty string when provided.');
  }

  if (parsed.delivery_terms !== undefined && !isNonEmptyString(parsed.delivery_terms)) {
    issues.push('delivery_terms must be a non-empty string when provided.');
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    issues.push('items must be a non-empty array.');
  }

  const normalizedItems = Array.isArray(parsed.items)
    ? parsed.items.map((item, index) => {
        if (!isPlainObject(item)) {
          issues.push(`items[${index}] must be an object.`);
          return item;
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

        if (item.total !== undefined && (typeof item.total !== 'number' || !Number.isFinite(item.total) || item.total < 0)) {
          issues.push(`items[${index}].total must be a number greater than or equal to 0 when provided.`);
        }

        return {
          ...item,
          description: String(item.description).trim(),
          quantity: Number(item.quantity),
          quantity_unit:
            item.quantity_unit === undefined ? undefined : String(item.quantity_unit).trim(),
          unit_price: Number(item.unit_price),
          pricing_unit:
            item.pricing_unit === undefined ? undefined : String(item.pricing_unit).trim(),
          total: item.total === undefined ? undefined : Number(item.total),
        };
      })
    : [];

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value: {
      ...(parsed as Record<string, unknown>),
      client_name: parsed.client_name.trim(),
      po_ref_no: parsed.po_ref_no.trim(),
      po_date: parsed.po_date.trim(),
      payment_terms:
        parsed.payment_terms === undefined ? undefined : String(parsed.payment_terms).trim(),
      delivery_terms:
        parsed.delivery_terms === undefined ? undefined : String(parsed.delivery_terms).trim(),
      items: normalizedItems,
    } as ContractCreateInput,
  };
}

function estimateContractTotal(items: ContractCreateInput['items']) {
  return items.reduce((sum, item) => {
    if (typeof item.total === 'number' && Number.isFinite(item.total)) {
      return sum + item.total;
    }

    return sum + item.quantity * item.unit_price;
  }, 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export function ContractCreatePage() {
  const router = useRouter();
  const { activeOrganisation, activeOrganisationId, isLoading } = useOrganisation();
  const [rawJson, setRawJson] = useState(SAMPLE_CONTRACT_JSON);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const parsedDraft = useMemo(() => validateContractDraft(rawJson), [rawJson]);
  const draft = parsedDraft.ok ? parsedDraft.value : null;
  const totalEstimate = draft ? estimateContractTotal(draft.items) : 0;

  const handleLoadSample = () => {
    setRawJson(SAMPLE_CONTRACT_JSON);
    setSubmitError(null);
    setStatusMessage('Sample JSON loaded into the editor.');
  };

  const handleFormatJson = () => {
    const nextDraft = validateContractDraft(rawJson);
    if (!nextDraft.ok) {
      setSubmitError(nextDraft.issues[0] ?? 'Fix the JSON before formatting it.');
      setStatusMessage(null);
      return;
    }

    setRawJson(JSON.stringify(nextDraft.value, null, 2));
    setSubmitError(null);
    setStatusMessage('JSON formatted for easier editing.');
  };

  const handleClear = () => {
    setRawJson('');
    setSubmitError(null);
    setStatusMessage(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setStatusMessage(null);

    if (!activeOrganisationId) {
      setSubmitError('Select an organisation first from the dashboard.');
      return;
    }

    if (!parsedDraft.ok) {
      setSubmitError(parsedDraft.issues[0] ?? 'Fix the JSON before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createContract(activeOrganisationId, parsedDraft.value);
      setStatusMessage(`Created contract ${created.id}. Redirecting to detail view...`);
      router.push(`/contracts/${created.id}`);
    } catch (error) {
      const friendlyError = toFriendlyApiError(error);
      setSubmitError(friendlyError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const editorIssues = parsedDraft.ok ? [] : parsedDraft.issues;
  const hasOrganisation = Boolean(activeOrganisationId && activeOrganisation);

  return (
    <main className="app-shell min-h-[100dvh] text-slate-950">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="surface-strong reveal-up rounded-[2rem] px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Create contract</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[0.96]">
                Paste structured JSON and create a new contract.
              </h1>
              <p className="section-copy mt-4 max-w-2xl">
                This screen stays intentionally simple. The user pastes contract JSON, checks the
                preview, and submits it to the backend using the active organisation scope.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
              >
                Back to dashboard
              </Link>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
              >
                Load sample JSON
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryRow
              label="Active organisation"
              value={activeOrganisation?.name ?? 'No organisation selected'}
            />
            <SummaryRow
              label="Payload status"
              value={parsedDraft.ok ? 'Ready to submit' : 'Needs fixes'}
            />
            <SummaryRow
              label="Validation mode"
              value={isLoading ? 'Loading scope' : hasOrganisation ? 'Scoped' : 'Blocked'}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="surface-strong reveal-up reveal-up-delay-1 rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">JSON editor</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  Contract field data
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Keep the raw payload visible so it is easy to test, edit, and submit without
                  hiding any of the business data.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
                >
                  Format JSON
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
              <label htmlFor="contract-json" className="sr-only">
                Contract JSON
              </label>
              <textarea
                id="contract-json"
                value={rawJson}
                onChange={(event) => setRawJson(event.target.value)}
                spellCheck={false}
                className="min-h-[28rem] w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-4 font-mono text-[0.85rem] leading-6 text-slate-900 outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-slate-400"
                placeholder="Paste contract JSON here"
              />
            </div>

            <div className="mt-4 space-y-3">
              {submitError ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {submitError}
                </div>
              ) : null}

              {statusMessage ? (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                  {statusMessage}
                </div>
              ) : null}

              {!parsedDraft.ok ? (
                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                  <p className="font-semibold text-amber-900">Fix these issues first</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {editorIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-600">
                The backend will still validate the payload, but the form catches obvious problems
                before the request leaves the browser.
              </p>
              <button
                type="button"
                disabled={!hasOrganisation || isSubmitting}
                onClick={() => void handleSubmit()}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating...' : 'Create contract'}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="surface-strong reveal-up reveal-up-delay-2 rounded-[1.75rem] p-5 sm:p-6">
              <p className="section-kicker">Preview</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                What will be sent
              </h2>

              {draft ? (
                <div className="mt-5 space-y-3">
                  <SummaryRow label="Client" value={draft.client_name} />
                  <SummaryRow label="PO reference" value={draft.po_ref_no} />
                  <SummaryRow label="PO date" value={draft.po_date} />
                  <SummaryRow label="Line items" value={String(draft.items.length)} />
                  <SummaryRow label="Estimated total" value={formatCurrency(totalEstimate)} />
                </div>
              ) : (
                <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  Fix the JSON on the left to unlock the live preview.
                </div>
              )}
            </section>

            <section className="surface-strong reveal-up reveal-up-delay-2 rounded-[1.75rem] p-5 sm:p-6">
              <p className="section-kicker">Notes</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                What this flow teaches
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>1. The payload stays visible, so validation bugs are easy to spot.</p>
                <p>2. The active organisation still scopes every request.</p>
                <p>3. Success moves the user straight into the contract detail route.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
