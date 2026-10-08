import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type AuditEntry } from "../../api";
import { ActorBadge, Badge, Button, DataTable, EmptyState, ErrorNote, Input, LoadingBlock, PageHeader, Select, type Column } from "../../components/ui";
import { dateTime, percent, titleCase } from "../../lib/format";

const PAGE = 25;

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "audit", action, actor, entity, page],
    queryFn: () => api.adminAudit({ action, actor_type: actor, entity_type: entity, limit: PAGE, offset: page * PAGE }),
    placeholderData: (prev) => prev,
  });
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const columns: Column<AuditEntry>[] = [
    { key: "time", header: "When", render: (a) => <span className="whitespace-nowrap text-muted">{dateTime(a.created_at)}</span> },
    { key: "action", header: "Action", render: (a) => <span className="font-semibold">{titleCase(a.action)}</span> },
    { key: "actor", header: "Actor", render: (a) => <ActorBadge actor={a.actor_type} /> },
    { key: "user", header: "User", render: (a) => <span className="text-muted">{a.user_email ?? "system"}</span> },
    { key: "entity", header: "Entity", render: (a) => <Badge>{titleCase(a.entity_type)}</Badge> },
    { key: "conf", header: "Confidence", align: "right", render: (a) => percent(a.confidence_score) },
  ];

  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader icon="shieldCheck" tone="emerald" title="Audit log" description="Immutable trail of AI and human actions across the platform." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input aria-label="Action contains" placeholder="Action contains… e.g. rfq" value={action} onChange={(e) => reset(setAction)(e.target.value)} />
        <Select aria-label="Actor type" value={actor} onChange={(e) => reset(setActor)(e.target.value)}>
          <option value="">All actors</option>
          <option value="human">Human</option>
          <option value="ai">AI</option>
          <option value="system">System</option>
        </Select>
        <Input aria-label="Entity type" placeholder="Entity type e.g. quotations" value={entity} onChange={(e) => reset(setEntity)(e.target.value)} />
      </div>
      <ErrorNote error={error} />
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <DataTable columns={columns} rows={data.items} rowKey={(a) => a.id} empty={<EmptyState icon="shieldCheck" tone="emerald" title="No audit entries match" />} />
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              {total} entries · page {page + 1} of {pages} {isFetching ? "· updating…" : ""}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon="arrowLeft" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
