import type { ReactNode } from "react";
import { GeoPattern, type PatternVariant } from "./Card";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="label-caps mb-2">{eyebrow}</p> : null}
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Large page hero with an abstract SVG pattern backdrop. */
export function Hero({
  eyebrow,
  title,
  description,
  actions,
  pattern = "grid",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  pattern?: PatternVariant;
}) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-card border border-line bg-surface">
      <GeoPattern variant={pattern} className="absolute inset-0 h-full w-full text-subtle opacity-40" />
      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        {eyebrow ? <p className="label-caps mb-3">{eyebrow}</p> : null}
        <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{description}</p> : null}
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
