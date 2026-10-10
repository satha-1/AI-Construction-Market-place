import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../layouts/StorefrontLayout";
import { useTheme } from "../lib/theme";
import { Icon, type IconName } from "./Icon";
import { IconTile } from "./ui";

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

/** Solid auth layout matching the marketplace UI (no translucent panels). */
export default function AuthShell({ title, subtitle, children, footer }: Props) {
  useTheme("storefront");
  return (
    <div className="theme-root flex min-h-dvh items-center justify-center bg-gradient-to-br from-accent-soft via-white to-sky-50 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-card border border-line bg-white shadow-lift lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-accent to-secondary p-10 text-white lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-teal-700">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> Conapp marketplace
            </Link>
            <h2 className="mt-6 text-4xl font-black leading-tight">
              Estimate faster.
              <br />
              Source smarter.
            </h2>
            <p className="mt-4 text-sm text-white/90">Browse materials in public. Sign in to request quotations or sell from your catalog.</p>
          </div>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p.title} className="flex items-start gap-4 rounded-card bg-white p-4 text-ink shadow-card">
                <IconTile icon={p.icon} tone="teal" />
                <span>
                  <span className="block text-sm font-bold">{p.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col bg-white px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-8">
            <Brand to="/" />
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
