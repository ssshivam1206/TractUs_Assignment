'use client';

import { useOrganisation } from '@/state/organisation-context';

export function OrganisationSelector() {
  const {
    activeOrganisation,
    activeOrganisationId,
    error,
    isLoading,
    organisations,
    refreshOrganisations,
    setActiveOrganisationId,
  } = useOrganisation();

  const isEmpty = !isLoading && !error && organisations.length === 0;

  return (
    <section className="surface-strong reveal-up rounded-[1.75rem] border border-slate-200/80 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="section-kicker">Organisation scope</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Choose the active workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The selected organisation controls the contracts, detail view, and workflow actions shown below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOrganisations()}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50"
        >
          Refresh list
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] lg:items-stretch">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
          <label htmlFor="organisation-select" className="sr-only">
            Select organisation
          </label>
          <select
            id="organisation-select"
            value={activeOrganisationId ?? ''}
            disabled={isLoading || isEmpty}
            onChange={(event) => setActiveOrganisationId(event.target.value || null)}
            className="min-h-[3.5rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-200 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select organisation</option>
            {organisations.map((organisation) => (
              <option key={organisation.id} value={organisation.id}>
                {organisation.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-h-[5.5rem] items-center rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm shadow-slate-200/40">
          {isLoading ? (
            <p>Loading organisations from the backend.</p>
          ) : error ? (
            <p className="text-rose-600">{error}</p>
          ) : isEmpty ? (
            <p>No organisations are available yet. Seed or create one from the backend first.</p>
          ) : activeOrganisation ? (
            <p>
              Working inside <span className="font-semibold text-slate-950">{activeOrganisation.name}</span>.
            </p>
          ) : (
            <p>Select an organisation to unlock contract creation, filtering, and workflow actions.</p>
          )}
        </div>
      </div>
    </section>
  );
}
