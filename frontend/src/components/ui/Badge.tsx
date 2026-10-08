import type { ReactNode } from "react";
import { cx, titleCase } from "../../lib/format";
import { Icon, type IconName } from "../Icon";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "violet";

const tones: Record<BadgeTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  success: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  info: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  accent: { pill: "bg-accent-soft text-teal-700", dot: "bg-accent" },
  violet: { pill: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
};

export function Badge({ tone = "neutral", children, className, dot, icon }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean; icon?: IconName }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", tones[tone].pill, className)}>
      {icon ? <Icon name={icon} className="h-3.5 w-3.5" /> : dot ? <span className={cx("h-1.5 w-1.5 rounded-full", tones[tone].dot)} /> : null}
      {children}
    </span>
  );
}

/** Who performed an audited action. */
export function ActorBadge({ actor }: { actor: string }) {
  if (actor === "ai") return <Badge tone="violet" icon="sparkles">AI</Badge>;
  if (actor === "system") return <Badge tone="neutral" icon="sliders">System</Badge>;
  return <Badge tone="accent" icon="user">Human</Badge>;
}

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  analyzing: "info",
  estimated: "violet",
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
  active: "success",
  inactive: "danger",
  corrected: "violet",
  resolved: "success",
  success: "success",
  completed: "success",
  running: "info",
  error: "danger",
  awaiting_verification: "warning",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge dot tone={statusTone[status] ?? "neutral"} className={className}>
      {titleCase(status)}
    </Badge>
  );
}
