import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/format";

export type PatternVariant = "grid" | "circles" | "diagonal" | "blocks" | "arcs";

/** Abstract architectural SVG pattern – hairline strokes, no photography. */
export function GeoPattern({ variant = "grid", className }: { variant?: PatternVariant; className?: string }) {
  const stroke = { stroke: "currentColor", strokeWidth: 0.3, fill: "none" } as const;
  return (
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {variant === "grid" && (
        <g {...stroke}>
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="120" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} />
          ))}
          <rect x="40" y="20" width="60" height="60" strokeWidth={0.5} />
          <rect x="100" y="40" width="60" height="60" strokeWidth={0.5} />
        </g>
      )}
      {variant === "circles" && (
        <g {...stroke}>
          {[12, 24, 36, 48, 60, 72].map((r) => (
            <circle key={r} cx="100" cy="60" r={r} />
          ))}
          <line x1="0" y1="60" x2="200" y2="60" />
          <line x1="100" y1="0" x2="100" y2="120" />
        </g>
      )}
      {variant === "diagonal" && (
        <g {...stroke}>
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1={i * 10 - 40} y1="120" x2={i * 10 + 40} y2="0" />
          ))}
          <rect x="60" y="30" width="80" height="60" strokeWidth={0.5} />
        </g>
      )}
      {variant === "blocks" && (
        <g {...stroke}>
          <rect x="20" y="60" width="40" height="40" />
          <rect x="60" y="30" width="40" height="70" />
          <rect x="100" y="45" width="40" height="55" />
          <rect x="140" y="15" width="40" height="85" />
          <line x1="0" y1="100" x2="200" y2="100" strokeWidth={0.5} />
          <line x1="80" y1="30" x2="160" y2="15" />
        </g>
      )}
      {variant === "arcs" && (
        <g {...stroke}>
          {[20, 40, 60, 80, 100].map((r) => (
            <path key={r} d={`M ${100 - r} 110 A ${r} ${r} 0 0 1 ${100 + r} 110`} />
          ))}
          <line x1="0" y1="110" x2="200" y2="110" strokeWidth={0.5} />
        </g>
      )}
    </svg>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & { hoverable?: boolean; padded?: boolean };

export function Card({ className, hoverable, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-card border border-line bg-surface transition-colors duration-ui ease-ui",
        hoverable && "card-hover hover:border-ink/70",
        padded && "p-5",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  pattern = "grid",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  pattern?: PatternVariant;
}) {
  return (
    <Card hoverable padded={false} className="group relative overflow-hidden">
      <GeoPattern
        variant={pattern}
        className="absolute inset-0 h-full w-full text-subtle opacity-30 transition-opacity duration-ui group-hover:opacity-60"
      />
      <div className="relative p-5">
        <p className="label-caps">{label}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
      </div>
    </Card>
  );
}
