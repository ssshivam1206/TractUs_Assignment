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
        <header className="surface-strong reveal-up overflow-hidden rounded-[2rem] border border-slate-200/80">
          <div className="border-b border-slate-200/80 px-6 py-6 sm:px-7 lg:px-8 lg:py-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-center">
              <div className="max-w-3xl">
                <p className="section-kicker">TractUs contract operations</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]">
                  Review, create, and move contracts from one scoped workspace.
                </h1>
                <p className="section-copy mt-4 max-w-xl">
                  Keep contracts, workflow actions, and audit visibility in one clean place.
                </p>
              </div>

              {isLoading ? (
                <div className="grid gap-3">
                  <SkeletonCard className="min-h-[6.2rem]" />
                  <SkeletonCard className="min-h-[6.2rem]" />
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] p-5 shadow-sm shadow-slate-200/50">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Active organisation</p>
                      <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                        {activeOrganisation?.name ?? 'No organisation selected'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                      <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Session</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{isUnlocked ? 'Ready' : 'Selection required'}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Organisations</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{organisations.length.toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 bg-slate-50/70 px-6 py-5 sm:px-7 lg:grid-cols-3 lg:px-8">
            <Metric
              label="Organisations"
              value={organisations.length.toString().padStart(2, '0')}
              note="Available workspaces for contract review and creation."
            />
            <Metric
              label="Active scope"
              value={isUnlocked ? 'ON' : 'OFF'}
              note="Actions unlock after you choose an organisation."
            />
            <Metric
              label="Workspace"
              value={isUnlocked ? 'Ready' : 'Waiting'}
              note="Use the selector below to create, review, and update contracts."
            />
          </div>
        </header>

        <section className="space-y-6">
          <OrganisationSelector />
          <ContractListPage key={activeOrganisationId ?? 'no-org'} organisationId={activeOrganisationId} />
        </section>
      </section>
    </main>
  );
}
