import { useQuery } from "@tanstack/react-query";
import { api, type AuditEntry } from "../../api";
import { Badge, DataTable, EmptyState, ErrorNote, LoadingBlock, type Column } from "../../components/ui";
import { dateTime, percent, titleCase } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

export default function AuditTab() {
  const projectId = useProjectId();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["audit", projectId], queryFn: () => api.audit(projectId) });
  const columns: Column<AuditEntry>[] = [
    { key: "time", header: "When", render: (a) => <span className="whitespace-nowrap text-muted">{dateTime(a.created_at)}</span> },
    { key: "action", header: "Action", render: (a) => <span className="font-bold">{titleCase(a.action)}</span> },
    { key: "actor", header: "Actor", render: (a) => <Badge tone={a.actor_type === "ai" ? "info" : "neutral"}>{a.actor_type}</Badge> },
    { key: "entity", header: "Entity", render: (a) => <span className="text-muted">{a.entity_type}</span> },
    { key: "conf", header: "Confidence", align: "right", render: (a) => percent(a.confidence_score) },
  ];
  return (
    <>
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={data} rowKey={(a) => a.id} empty={<EmptyState title="No audit entries yet" />} />}
    </>
  );
}
