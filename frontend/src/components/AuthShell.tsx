import type { ReactNode } from "react";
import { GeoPattern } from "./ui";
import { Brand } from "../layouts/StorefrontLayout";
import { useTheme } from "../lib/theme";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  useTheme("storefront");
  return (
    <div className="theme-root flex items-center justify-center bg-soft px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-card border border-line bg-surface shadow-lift lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-accent p-10 text-accent-fg lg:flex">
          <GeoPattern variant="blocks" className="absolute inset-0 h-full w-full text-white opacity-25" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">Conapp</p>
            <h2 className="mt-6 text-4xl font-black leading-tight">Estimate faster. Source smarter.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/90">
              AI construction estimation and a vendor marketplace in one workspace — projects, BOQs, and quotations.
            </p>
          </div>
          <ul className="relative space-y-3 text-sm">
            <li className="rounded-ui bg-white/15 px-4 py-3 backdrop-blur">Upload drawings and generate a BOQ</li>
            <li className="rounded-ui bg-white/15 px-4 py-3 backdrop-blur">Match vendors against your quantities</li>
            <li className="rounded-ui bg-white/15 px-4 py-3 backdrop-blur">Compare quotations in one place</li>
          </ul>
        </aside>

        <section className="flex flex-col px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-8">
            <Brand />
          </div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-sm text-muted">{footer}</div>
        </section>
      </div>
    </div>
  );
}
