export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(253,186,116,0.18),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_45%,_#f8fafc_45%,_#f8fafc_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel mb-6 flex flex-col gap-4 rounded-3xl px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
              TractUs
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Contract Operations Console
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Phase 1 shell: organisation scoping, contract workflow, realtime updates,
              and backend-driven search all start from here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Active organisation
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">Demo Org</p>
            </div>
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800">
              Select organisation
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Overview</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    Dashboard preview for the assignment
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Backend connected later
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <article className="feature-card">
                  <p className="feature-label">Contracts</p>
                  <p className="feature-value">05</p>
                  <p className="feature-note">Seeded data and live list view later</p>
                </article>
                <article className="feature-card">
                  <p className="feature-label">Drafts</p>
                  <p className="feature-value">02</p>
                  <p className="feature-note">Editable until finalized</p>
                </article>
                <article className="feature-card">
                  <p className="feature-label">Live updates</p>
                  <p className="feature-value">ON</p>
                  <p className="feature-note">SSE event stream across tabs</p>
                </article>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Contract list</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    Backend-driven search and pagination
                  </h2>
                </div>
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Add contract
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-5 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>Contract</span>
                  <span>Client</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>
                <div className="grid grid-cols-5 gap-3 px-4 py-4 text-sm text-slate-700">
                  <span className="font-medium text-slate-950">CTR-001</span>
                  <span>Acme Trading</span>
                  <span><span className="status-pill status-draft">Draft</span></span>
                  <span>Today</span>
                  <span className="text-slate-500">View / Edit</span>
                </div>
                <div className="grid grid-cols-5 gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <span className="font-medium text-slate-950">CTR-002</span>
                  <span>Beta Ltd</span>
                  <span><span className="status-pill status-finalized">Finalized</span></span>
                  <span>Yesterday</span>
                  <span className="text-slate-500">Archive</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="glass-panel rounded-3xl p-6">
              <p className="text-sm font-medium text-slate-500">Getting started</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                What Phase 1 should give you
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li>1. A working Next.js app.</li>
                <li>2. A clean dashboard shell.</li>
                <li>3. A place for organisation scoping later.</li>
                <li>4. A layout ready for contract pages.</li>
              </ul>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <p className="text-sm font-medium text-slate-500">UI notes</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Leakhify-like direction
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The goal is a polished SaaS dashboard: soft borders, clear spacing,
                calm colors, and business-like typography rather than a generic starter page.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
