'use client';

import type { ContractAuditEvent } from '@/types/contract';
import { Skeleton } from '@/components/ui-skeletons';

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
      return {
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        accent: 'bg-emerald-400',
        border: 'border-emerald-200/80',
        panel: 'bg-emerald-50/60',
      };
    case 'UPDATE':
      return {
        badge: 'bg-sky-50 text-sky-700 ring-sky-200',
        accent: 'bg-sky-400',
        border: 'border-sky-200/80',
        panel: 'bg-sky-50/60',
      };
    case 'FINALIZE':
      return {
        badge: 'bg-violet-50 text-violet-700 ring-violet-200',
        accent: 'bg-violet-400',
        border: 'border-violet-200/80',
        panel: 'bg-violet-50/60',
      };
    case 'ARCHIVE':
      return {
        badge: 'bg-slate-100 text-slate-700 ring-slate-200',
        accent: 'bg-slate-400',
        border: 'border-slate-200/80',
        panel: 'bg-slate-100/70',
      };
    case 'DELETE':
      return {
        badge: 'bg-rose-50 text-rose-700 ring-rose-200',
        accent: 'bg-rose-400',
        border: 'border-rose-200/80',
        panel: 'bg-rose-50/60',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 ring-slate-200',
        accent: 'bg-slate-400',
        border: 'border-slate-200/80',
        panel: 'bg-slate-100/70',
      };
  }
}

function getHeadline(event: ContractAuditEvent) {
  const beforeStatus = event.before_state?.status ?? 'None';
  const afterStatus = event.after_state?.status ?? 'Removed';

  if (event.event_type === 'CREATE') {
    return `${afterStatus} contract created`;
  }

  if (event.event_type === 'DELETE') {
    return `${beforeStatus} contract removed`;
  }

  return `${beforeStatus} to ${afterStatus}`;
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
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-5 shadow-sm shadow-slate-200/40 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Audit trail</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Lifecycle history across the contract</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Every server-confirmed contract action is recorded here so you can follow status, ownership, and payload changes in sequence.
          </p>
        </div>
        <span className="premium-pill self-start sm:self-auto whitespace-nowrap">{events.length} events</span>
      </div>

      {isLoading ? (
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="w-[20rem] rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="mt-4 h-6 w-40 rounded-2xl" />
                <Skeleton className="mt-3 h-4 w-full rounded-full" />
                <Skeleton className="mt-5 h-20 w-full rounded-[1.1rem]" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="mt-6 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</p>
      ) : events.length === 0 ? (
        <div className="mt-6 rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
          No audit events have been recorded for this contract yet.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto pb-2">
          <ol className="flex min-w-max gap-4 pr-1">
            {events.map((event, index) => {
              const tone = getEventTone(event.event_type);

              return (
                <li key={event.id} className="group relative w-[21rem] shrink-0">
                  {index < events.length - 1 ? (
                    <span className="absolute left-[calc(100%-0.75rem)] top-6 hidden h-px w-6 bg-slate-200 lg:block" aria-hidden="true" />
                  ) : null}
                  <div className={`h-full rounded-[1.5rem] border ${tone.border} bg-white p-5 shadow-sm shadow-slate-200/50 transition duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-lg`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${tone.accent}`} aria-hidden="true" />
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ring-1 ${tone.badge}`}>
                          {event.event_type}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{formatDateTime(event.created_at)}</span>
                    </div>

                    <div className="mt-5">
                      <p className="text-lg font-semibold tracking-tight text-slate-950">{getHeadline(event)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {event.after_state?.client_name ?? event.before_state?.client_name ?? 'Contract snapshot unavailable'}
                      </p>
                    </div>

                    <div className={`mt-5 rounded-[1.2rem] border border-slate-200/80 ${tone.panel} px-4 py-3`}>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Transition</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {event.before_state?.status ?? 'None'}{' -> '}{event.after_state?.status ?? 'Removed'}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
