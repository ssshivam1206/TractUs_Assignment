'use client';

import type { ContractAuditEvent } from '@/types/contract';
import { SkeletonTimeline } from '@/components/ui-skeletons';

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

function getEventTone(eventType: ContractAuditEvent['event_type']) {
  switch (eventType) {
    case 'CREATE':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    case 'UPDATE':
      return 'bg-sky-100 text-sky-700 ring-sky-200';
    case 'FINALIZE':
      return 'bg-violet-100 text-violet-700 ring-violet-200';
    case 'ARCHIVE':
      return 'bg-amber-100 text-amber-700 ring-amber-200';
    case 'DELETE':
      return 'bg-rose-100 text-rose-700 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

function formatStateSummary(event: ContractAuditEvent) {
  const beforeStatus = event.before_state?.status ?? 'none';
  const afterStatus = event.after_state?.status ?? 'none';
  const beforeClient = event.before_state?.client_name ?? 'n/a';
  const afterClient = event.after_state?.client_name ?? 'n/a';

  return `${beforeStatus} -> ${afterStatus} | ${beforeClient} -> ${afterClient}`;
}

export function ContractAuditTrail({
  events,
  isLoading,
  error,
}: Readonly<{
  events: ContractAuditEvent[];
  isLoading: boolean;
  error: string | null;
}>) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Audit trail
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-950">
            Contract lifecycle events
          </h3>
        </div>
        <span className="premium-pill">{events.length} events</span>
      </div>

      {isLoading ? (
        <div className="mt-4">
          <SkeletonTimeline rows={2} />
        </div>
      ) : error ? (
        <p className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
          {error}
        </p>
      ) : events.length === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          No audit events have been recorded for this contract yet.
        </div>
      ) : (
        <ol className="mt-5 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="relative pl-6">
              <span
                className="absolute left-[0.45rem] top-2 h-full w-px bg-slate-200"
                aria-hidden="true"
              />
              <span
                className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ${getEventTone(event.event_type)}`}
                aria-hidden="true"
              />
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ring-1 ${getEventTone(event.event_type)}`}
                  >
                    {event.event_type}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {formatDateTime(event.created_at)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{formatStateSummary(event)}</p>
                <dl className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Before
                    </dt>
                    <dd className="mt-1 break-words">
                      {event.before_state
                        ? `${event.before_state.status} | ${event.before_state.client_name}`
                        : 'Initial create'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                      After
                    </dt>
                    <dd className="mt-1 break-words">
                      {event.after_state
                        ? `${event.after_state.status} | ${event.after_state.client_name}`
                        : 'Removed'}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
