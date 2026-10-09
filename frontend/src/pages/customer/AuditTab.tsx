import { useQuery } from "@tanstack/react-query";
import { api, type AuditEntry } from "../../api";
import { ActorBadge, Badge, Card, EmptyState, ErrorNote, IconTile, LoadingBlock } from "../../components/ui";
import { dateTime, percent, titleCase } from "../../lib/format";
import type { IconName } from "../../components/Icon";
import type { Tone } from "../../lib/visuals";
import { useProjectId } from "./ProjectWorkspace";

function visualFor(action: string): { icon: IconName; tone: Tone } {
  if (action.includes("verification") || action.includes("correct")) return { icon: "shieldCheck", tone: "amber" };
  if (action.includes("estimate") || action.includes("boq")) return { icon: "calculator", tone: "violet" };
  if (action.includes("rfq") || action.includes("quotation")) return { icon: "inbox", tone: "blue" };
  if (action.includes("agent")) return { icon: "sparkles", tone: "violet" };
  if (action.includes("document") || action.includes("upload")) return { icon: "file", tone: "teal" };
  return { icon: "clock", tone: "slate" };
}

function Diff({ label, value }: { label: string; value: Record<string, unknown> | null | undefined }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <div className="rounded-ui bg-soft px-3 py-2">
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <dl className="space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <dt className="shrink-0 font-medium text-subtle">{k}</dt>
            <dd className="min-w-0 break-all text-ink">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuditTab() {
  const projectId = useProjectId();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["audit", projectId], queryFn: () => api.audit(projectId) });

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorNote error={error} />;
  if (data.length === 0) {
    return <EmptyState icon="shieldCheck" tone="emerald" title="No audit entries yet" description="Every human and AI action on this project will be recorded here." />;
  }

  return (
    <Card>
      <ol className="relative space-y-0">
        {data.map((a: AuditEntry, i) => {
          const v = visualFor(a.action);
          const last = i === data.length - 1;
          return (
            <li key={a.id} className="relative flex gap-4 pb-8 last:pb-0">
              {!last ? <span className="absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px bg-line" aria-hidden /> : null}
              <IconTile icon={v.icon} tone={v.tone} round />
              <div className="min-w-0 flex-1 rounded-card border border-line bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{titleCase(a.action)}</p>
                    <p className="mt-0.5 text-xs text-muted">{dateTime(a.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ActorBadge actor={a.actor_type} />
                    <Badge>{titleCase(a.entity_type)}</Badge>
                    {a.source_reference ? (
                      <Badge tone="info" icon="file">
                        {a.source_reference}
                      </Badge>
                    ) : null}
                    {a.confidence_score != null ? (
                      <Badge tone="violet" icon="sparkles">
                        {percent(a.confidence_score)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {(a.before_value || a.after_value) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Diff label="Before" value={a.before_value} />
                    <Diff label="After" value={a.after_value} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
