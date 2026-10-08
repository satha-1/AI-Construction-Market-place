import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-8 sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 top-[-4rem] h-72 w-72 rounded-full bg-amber-400/50 blur-3xl" />
        <div className="absolute right-[-3rem] top-1/4 h-80 w-80 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-teal-400/40 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-fuchsia-950/40 lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-600 p-10 text-white lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">Conapp</p>
            <h2 className="mt-6 text-4xl font-semibold leading-tight">Estimate faster. Source smarter.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/90">
              AI construction estimation and a vendor marketplace in one workspace — projects, BOQs, and quotations.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">Upload drawings and generate a BOQ</li>
            <li className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">Match vendors against your quantities</li>
            <li className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">Compare quotations in one place</li>
          </ul>
        </aside>

        <section className="flex flex-col">
          <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-600 px-6 py-7 text-white sm:px-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">Conapp</p>
            <p className="mt-2 text-lg font-semibold">Construction marketplace</p>
          </div>
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
            <div className="mt-6 text-sm text-slate-600">{footer}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
