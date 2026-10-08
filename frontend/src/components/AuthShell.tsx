import type { ReactNode } from "react";
import { Brand } from "../layouts/StorefrontLayout";
import { useTheme } from "../lib/theme";
import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const perks: { icon: IconName; title: string; text: string }[] = [
  { icon: "upload", title: "Upload drawings", text: "PDFs, scans and spreadsheets are parsed automatically." },
  { icon: "calculator", title: "Instant BOQ & estimate", text: "Deterministic quantities and costs, with human review." },
  { icon: "store", title: "Verified vendors", text: "Request quotes and compare them side by side." },
];

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  useTheme("storefront");
  return (
    <div className="theme-root flex items-center justify-center bg-gradient-to-br from-accent-soft via-surface to-sky-50 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-card border border-line bg-surface shadow-lift lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-accent to-secondary p-10 text-white lg:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> AI construction marketplace
            </span>
            <h2 className="mt-6 text-4xl font-black leading-tight">Estimate faster.
              <br />
              Source smarter.</h2>
          </div>
          <ul className="space-y-4">
            {perks.map((p) => (
              <li key={p.title} className="flex items-start gap-4 rounded-card bg-white/10 p-4 backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-accent">
                  <Icon name={p.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{p.title}</span>
                  <span className="mt-0.5 block text-sm text-white/85">{p.text}</span>
                </span>
              </li>
            ))}
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
