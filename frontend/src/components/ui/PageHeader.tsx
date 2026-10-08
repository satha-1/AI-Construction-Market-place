import type { ReactNode } from "react";
import type { Tone } from "../../lib/visuals";
import { Icon, type IconName } from "../Icon";
import { IconTile } from "./Card";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
  tone = "teal",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: IconName;
  tone?: Tone;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {icon ? <IconTile icon={icon} tone={tone} size="lg" /> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="mb-0.5 text-xs font-semibold text-accent">{eyebrow}</p> : null}
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Welcome banner: soft teal→blue wash with a large icon on the right. */
export function Hero({
  eyebrow,
  title,
  description,
  actions,
  icon = "sparkles",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: IconName;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-card border border-line bg-gradient-to-br from-accent-soft via-surface to-sky-50 shadow-card">
      <div className="relative flex items-center justify-between gap-6 px-6 py-7 sm:px-8 sm:py-8">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-xs font-semibold text-accent">{eyebrow}</p> : null}
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p> : null}
          {actions ? <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
        <div className="relative hidden shrink-0 md:block" aria-hidden="true">
          <div className="absolute -inset-6 rounded-full bg-accent/10 blur-2xl" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface text-accent shadow-lift">
            <Icon name={icon} className="h-11 w-11" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </section>
  );
}
