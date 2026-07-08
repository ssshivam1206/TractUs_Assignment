'use client';

import { ContractListPage } from '@/components/contract-list-page';
import { OrganisationSelector } from '@/components/organisation-selector';
import { SkeletonCard } from '@/components/ui-skeletons';
import { useOrganisation } from '@/state/organisation-context';

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="metric-tile">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </div>
  );
}

export function DashboardHome() {
  const { activeOrganisation, activeOrganisationId, organisations, isLoading } = useOrganisation();
  const hasSelectedOrganisation = Boolean(activeOrganisationId && activeOrganisation);
  const isUnlocked = hasSelectedOrganisation && !isLoading;

  return (
    <main className="app-shell min-h-[100dvh] text-slate-950">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="surface-strong reveal-up rounded-[2rem] px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="section-kicker">TractUs</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[0.96]">
                Contract operations that feel calm, clear, and premium.
              </h1>
              <p className="section-copy mt-4 max-w-2xl">
                This frontend keeps the same functionality, but the presentation is now cleaner and
                more production-ready. The organisation selector, contract list, and empty states
                live in a simpler layout with stronger hierarchy.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {isLoading ? (
                <>
                  <SkeletonCard className="min-h-[7.5rem]" />
                  <SkeletonCard className="min-h-[7.5rem]" />
                  <SkeletonCard className="min-h-[7.5rem]" />
                </>
              ) : (
                <>
                  <div className="surface rounded-[1.25rem] px-4 py-4 shadow-sm">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Active organisation
                    </p>
                    <p className="mt-2 text-base font-semibold tracking-tight text-slate-950">
                      {activeOrganisation?.name ?? 'No organisation selected'}
                    </p>
                  </div>
                  <div className="surface rounded-[1.25rem] px-4 py-4 shadow-sm">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Session status
                    </p>
                    <p className="mt-2 text-base font-semibold tracking-tight text-slate-950">
                      {isUnlocked ? 'Scoped and ready' : 'Selection required'}
                    </p>
                  </div>
                  <div className="surface rounded-[1.25rem] px-4 py-4 shadow-sm">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Organisations
                    </p>
                    <p className="mt-2 text-base font-semibold tracking-tight text-slate-950">
                      {organisations.length.toString().padStart(2, '0')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <OrganisationSelector />

          <div className="surface-strong reveal-up reveal-up-delay-1 rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">Workspace status</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  Assignment console at a glance
                </h2>
              </div>
              <span className="premium-pill self-start sm:self-auto">
                {isUnlocked ? 'Organisation scoped' : 'Waiting for selection'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Metric
                label="Organisations"
                value={organisations.length.toString().padStart(2, '0')}
                note="Loaded from the backend and kept in shared state."
              />
              <Metric
                label="Active scope"
                value={isUnlocked ? 'ON' : 'OFF'}
                note="Contract requests stay blocked until a tenant is selected."
              />
              <Metric
                label="Last sync"
                value={isLoading ? '...' : 'Now'}
                note="We refresh organisations on page load and on demand."
              />
            </div>
          </div>

          <ContractListPage key={activeOrganisationId ?? 'no-org'} organisationId={activeOrganisationId} />
        </div>
      </section>
    </main>
  );
}
