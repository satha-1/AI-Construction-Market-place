import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type AdminProject } from "../../api";
import { DataTable, EmptyState, ErrorNote, LoadingBlock, PageHeader, SearchInput, StatusBadge, type Column } from "../../components/ui";
import { dateShort, money } from "../../lib/format";

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
      render: (p) => (
        <div>
          <p className="font-bold">{p.name}</p>
          <p className="text-[11px] text-muted">{p.location ?? "No location"}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (p) => (
        <div>
          <p>{p.owner_name}</p>
          <p className="text-[11px] text-muted">{p.owner_email}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "budget", header: "Budget cap", align: "right", render: (p) => money(p.budget_cap) },
    { key: "updated", header: "Updated", render: (p) => <span className="text-muted">{dateShort(p.updated_at)}</span> },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Projects" description="Read-only view of every project across customers." />
      <SearchInput className="mb-4 max-w-md" value={search} onChange={setSearch} placeholder="Search project or owner email" />
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} empty={<EmptyState title="No projects" description="Projects created by customers will appear here." />} />}
    </>
  );
}
