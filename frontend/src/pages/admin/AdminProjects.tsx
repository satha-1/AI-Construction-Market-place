import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type AdminProject } from "../../api";
import { DataTable, EmptyState, EntityCell, ErrorNote, LoadingBlock, PageHeader, SearchInput, StatusBadge, type Column } from "../../components/ui";
import { dateShort, money } from "../../lib/format";
import { toneFor } from "../../lib/visuals";

export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "projects"], queryFn: api.adminProjects });
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((p) => !term || p.name.toLowerCase().includes(term) || p.owner_email.toLowerCase().includes(term));
  }, [data, search]);

  const columns: Column<AdminProject>[] = [
    {
      key: "name",
      header: "Project",
      render: (p) => <EntityCell icon="folder" tone={toneFor(p.id)} title={p.name} subtitle={p.location ?? "No location"} />,
    },
    {
      key: "owner",
      header: "Owner",
      render: (p) => <EntityCell avatar={p.owner_name} title={p.owner_name} subtitle={p.owner_email} />,
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "budget", header: "Budget cap", align: "right", render: (p) => money(p.budget_cap) },
    { key: "updated", header: "Updated", render: (p) => <span className="text-muted">{dateShort(p.updated_at)}</span> },
  ];

  return (
    <>
      <PageHeader icon="folder" tone="blue" title="Projects" description="Read-only view of every project across customers." actions={<SearchInput className="w-full sm:w-80" value={search} onChange={setSearch} placeholder="Search project or owner email" />} />
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} empty={<EmptyState icon="folder" tone="blue" title="No projects" description="Projects created by customers will appear here." />} />}
    </>
  );
}
