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
    <section className="surface-strong reveal-up rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Organisation scope</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            Choose the active tenant
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Every contract request in the app uses this selected organisation id, so the data stays
            scoped and predictable.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOrganisations()}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98]"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
        <label htmlFor="organisation-select" className="sr-only">
          Select organisation
        </label>
        <select
          id="organisation-select"
          value={activeOrganisationId ?? ''}
          disabled={isLoading || isEmpty}
          onChange={(event) => setActiveOrganisationId(event.target.value)}
          className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition duration-150 ease-out focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">Select organisation</option>
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>
              {organisation.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
        {isLoading ? (
          <p>Loading organisations from the backend...</p>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : isEmpty ? (
          <p>No organisations found. Seed one from the backend first.</p>
        ) : activeOrganisation ? (
          <p>
            Active organisation is <span className="font-semibold text-slate-950">{activeOrganisation.name}</span>.
          </p>
        ) : (
          <p>Select an organisation to unlock contract operations.</p>
        )}
      </div>
    </section>
  );
}
