import Link from 'next/link';

export default function ContractDetailShell({
  params,
}: Readonly<{
  params: { contractId: string };
}>) {
  return (
    <main className="app-shell min-h-[100dvh] text-slate-950">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="surface-strong reveal-up rounded-[2rem] p-6 sm:p-7 lg:p-8">
          <p className="section-kicker">Contract detail</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            Contract detail shell
          </h1>
          <p className="section-copy mt-4 max-w-2xl">
            Contract <span className="font-semibold text-slate-950">{params.contractId}</span> is
            wired for navigation. The full detail, draft editing, and workflow controls will land in
            the next phase.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition duration-150 ease-out hover:-translate-y-px hover:bg-slate-800 active:scale-[0.98]"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
