import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type RfqSummary } from "../../api";
import { Badge, DataTable, EmptyState, EntityCell, ErrorNote, LoadingBlock, PageHeader, StatCard, StatusBadge, type Column } from "../../components/ui";
import { dateShort } from "../../lib/format";
import { useVendor } from "./useVendor";

export default function VendorRfqs() {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["vendor", "rfqs", vendor?.id], queryFn: () => api.vendorRfqs(vendor!.id), enabled: !!vendor });

  const awaiting = data.filter((r) => !r.has_quoted && r.status !== "closed").length;
  const columns: Column<RfqSummary>[] = [
    {
      key: "project",
      header: "Project",
      render: (r) => (
        <EntityCell
          icon={r.has_quoted ? "checkCircle" : "inbox"}
          tone={r.has_quoted ? "emerald" : "blue"}
          title={r.project_name ?? `RFQ #${r.id.slice(0, 8)}`}
          subtitle={r.project_location ?? "No location"}
        />
      ),
    },
    { key: "items", header: "Items", align: "right", render: (r) => r.line_count },
    { key: "deadline", header: "Deadline", render: (r) => <span className="text-muted">{dateShort(r.deadline)}</span> },
    { key: "received", header: "Received", render: (r) => <span className="text-muted">{dateShort(r.created_at)}</span> },
    { key: "status", header: "RFQ", render: (r) => <StatusBadge status={r.status} /> },
    { key: "quote", header: "My quote", render: (r) => (r.has_quoted ? <StatusBadge status={r.quotation_status ?? "submitted"} /> : <Badge tone={r.status === "closed" ? "neutral" : "warning"}>{r.status === "closed" ? "Missed" : "Awaiting"}</Badge>) },
  ];

  return (
    <>
      <PageHeader icon="inbox" tone="blue" title="RFQ inbox" description="Requests for quotation sent to you by customers. Open one to price each line." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Received" value={data.length} icon="inbox" tone="blue" />
        <StatCard label="Awaiting your quote" value={awaiting} icon="clock" tone="amber" />
        <StatCard label="Quoted" value={data.filter((r) => r.has_quoted).length} icon="checkCircle" tone="emerald" />
      </div>
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={data} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/vendor/rfqs/${r.id}`)} empty={<EmptyState icon="inbox" tone="blue" title="No RFQs yet" description="When a customer invites you to quote, it will appear here and in your notifications." />} />}
    </>
  );
}
