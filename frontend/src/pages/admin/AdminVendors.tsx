import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type AdminVendor } from "../../api";
import { DataTable, EmptyState, ErrorNote, LoadingBlock, PageHeader, SearchInput, Select, StatusBadge, useToast, type Column } from "../../components/ui";
import { dateShort, errorMessage } from "../../lib/format";

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
      render: (v) => (
        <div>
          <p className="font-bold">{v.company_name}</p>
          <p className="text-[11px] text-muted">{[v.category, v.location].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (v) => (
        <div>
          <p>{v.owner_name}</p>
          <p className="text-[11px] text-muted">{v.owner_email}</p>
        </div>
      ),
    },
    { key: "items", header: "Catalog", render: (v) => `${v.published_items}/${v.catalog_items} published` },
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
          className="!min-h-[36px] ml-auto max-w-[140px] text-xs"
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
      <PageHeader eyebrow="Admin" title="Vendors" description="Only approved vendors appear in the public marketplace and can be invited to RFQs." />
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
        <DataTable columns={columns} rows={rows} rowKey={(v) => v.id} empty={<EmptyState pattern="blocks" title="No vendors found" description="Vendor profiles appear here once vendors complete onboarding." />} />
      )}
    </>
  );
}
