import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type AdminVendor } from "../../api";
import { Icon } from "../../components/Icon";
import { DataTable, EmptyState, EntityCell, ErrorNote, LoadingBlock, PageHeader, SearchInput, Select, StatCard, StatusBadge, useToast, type Column } from "../../components/ui";
import { dateShort, errorMessage } from "../../lib/format";
import { categoryVisual } from "../../lib/visuals";

export default function AdminVendors() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "vendors"], queryFn: api.adminVendors });

  const setVendorStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.adminSetVendorStatus(id, status),
    onSuccess: () => {
      toast.success("Vendor status updated — the vendor has been notified");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter(
      (v) => (!status || v.status === status) && (!term || v.company_name.toLowerCase().includes(term) || v.owner_email.toLowerCase().includes(term)),
    );
  }, [data, search, status]);

  const columns: Column<AdminVendor>[] = [
    {
      key: "company",
      header: "Company",
      render: (v) => {
        const visual = categoryVisual(v.category ?? v.company_name);
        return <EntityCell icon={visual.icon} tone={visual.tone} title={v.company_name} subtitle={[v.category, v.location].filter(Boolean).join(" · ") || "—"} />;
      },
    },
    {
      key: "owner",
      header: "Owner",
      render: (v) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{v.owner_name}</p>
          <p className="truncate text-xs text-muted">{v.owner_email}</p>
        </div>
      ),
    },
    {
      key: "items",
      header: "Catalog",
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Icon name="box" className="h-4 w-4 text-subtle" />
          {v.published_items}/{v.catalog_items} published
        </span>
      ),
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v.status} /> },
    { key: "created", header: "Created", render: (v) => <span className="text-muted">{dateShort(v.created_at)}</span> },
    {
      key: "actions",
      header: "Set status",
      align: "right",
      render: (v) => (
        <Select
          aria-label={`Status for ${v.company_name}`}
          value={v.status}
          className="!min-h-[36px] ml-auto max-w-[150px]"
          onChange={(e) => setVendorStatus.mutate({ id: v.id, status: e.target.value })}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </Select>
      ),
    },
  ];

  return (
    <>
      <PageHeader icon="store" tone="blue" title="Vendors" description="Only approved vendors appear in the public marketplace and can be invited to RFQs." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="clock" tone="amber" label="Pending" value={data.filter((v) => v.status === "pending").length} />
        <StatCard icon="checkCircle" tone="emerald" label="Approved" value={data.filter((v) => v.status === "approved").length} />
        <StatCard icon="alert" tone="rose" label="Suspended" value={data.filter((v) => v.status === "suspended").length} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company or owner email" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(v) => v.id} empty={<EmptyState icon="store" tone="blue" title="No vendors found" description="Vendor profiles appear here once vendors complete onboarding." />} />
      )}
    </>
  );
}
