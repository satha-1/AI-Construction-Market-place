import type { ReactNode } from "react";
import { cx, titleCase } from "../../lib/format";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const tones: Record<Tone, string> = {
  neutral: "border-line bg-soft text-muted",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
  accent: "border-accent/30 bg-accent-soft text-ink",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-ui border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  draft: "neutral",
  analyzing: "info",
  estimated: "accent",
  sourcing: "warning",
  quoted: "info",
  closed: "neutral",
  open: "warning",
  responded: "info",
  submitted: "info",
  selected: "success",
  rejected: "danger",
  withdrawn: "neutral",
  approved: "success",
  pending: "warning",
  suspended: "danger",
  processed: "success",
  processing: "info",
  uploaded: "neutral",
  failed: "danger",
  published: "success",
  unpublished: "neutral",
  active: "success",
  inactive: "danger",
  corrected: "accent",
  resolved: "success",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{titleCase(status)}</Badge>;
}
