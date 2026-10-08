import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/format";
import { toneClasses, type Tone } from "../../lib/visuals";
import { Icon, type IconName } from "../Icon";

export type { Tone };

const tileSizes = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4" },
  md: { box: "h-10 w-10", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6" },
  xl: { box: "h-16 w-16", icon: "h-8 w-8" },
};

/** Soft coloured square/circle holding an icon – the core visual motif. */
export function IconTile({
  icon,
  tone = "teal",
  size = "md",
  round,
  className,
}: {
  icon: IconName;
  tone?: Tone;
  size?: keyof typeof tileSizes;
  round?: boolean;
  className?: string;
}) {
  const s = tileSizes[size];
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center", round ? "rounded-full" : "rounded-ui", s.box, toneClasses[tone].tile, className)}>
      <Icon name={icon} className={s.icon} />
    </span>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & { hoverable?: boolean; padded?: boolean };

export function Card({ className, hoverable, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-card border border-line bg-surface shadow-card transition-all duration-ui ease-ui",
        hoverable && "card-hover hover:border-accent/30",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ title, description, action, icon, tone }: { title: string; description?: string; action?: ReactNode; icon?: IconName; tone?: Tone }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconTile icon={icon} tone={tone} size="sm" /> : null}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: IconName;
  tone?: Tone;
}) {
  return (
    <Card className="flex items-start gap-4">
      <IconTile icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-subtle">{hint}</p> : null}
      </div>
    </Card>
  );
}

/** Horizontal proportion bars, e.g. users by role. */
export function BarList({ items }: { items: { label: string; value: number; tone?: Tone }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">{i.label}</span>
            <span className="text-muted">{i.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-soft">
            <div className={cx("h-full rounded-full transition-all duration-ui", toneClasses[i.tone ?? "teal"].bar)} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
