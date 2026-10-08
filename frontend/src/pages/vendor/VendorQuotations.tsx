import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type VendorQuotationRow } from "../../api";
import { DataTable, EmptyState, EntityCell, ErrorNote, LoadingBlock, PageHeader, StatCard, StatusBadge, type Column } from "../../components/ui";
import { dateTime, money } from "../../lib/format";
import { useVendor } from "./useVendor";

export default function VendorQuotations() {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["vendor", "quotations", vendor?.id], queryFn: () => api.vendorQuotations(vendor!.id), enabled: !!vendor });

  const won = data.filter((q) => q.status === "selected").length;
  const pipeline = data.filter((q) => q.status === "submitted").reduce((sum, q) => sum + Number(q.total_price || 0), 0);

  const columns: Column<VendorQuotationRow>[] = [
    {
      key: "rfq",
      header: "RFQ",
      render: (q) => (
        <EntityCell
          icon={q.status === "selected" ? "award" : "file"}
          tone={q.status === "selected" ? "emerald" : q.status === "rejected" ? "rose" : "teal"}
          title={`RFQ #${q.rfq_id.slice(0, 8)}`}
          subtitle={`Quotation #${q.id.slice(0, 8)}`}
        />
      ),
    },
    { key: "total", header: "Total", align: "right", render: (q) => <span className="font-semibold">{money(q.total_price, q.currency)}</span> },
    { key: "status", header: "Quotation", render: (q) => <StatusBadge status={q.status} /> },
    { key: "rfqStatus", header: "RFQ status", render: (q) => (q.rfq_status ? <StatusBadge status={q.rfq_status} /> : "—") },
    { key: "date", header: "Submitted", render: (q) => <span className="text-muted">{dateTime(q.submitted_at)}</span> },
  ];

  return (
    <>
      <PageHeader icon="file" title="My quotations" description="Everything you've submitted, and whether it was selected." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Submitted" value={data.length} icon="file" tone="teal" />
        <StatCard label="Won" value={won} hint={data.length ? `${Math.round((won / data.length) * 100)}% win rate` : undefined} icon="award" tone="emerald" />
        <StatCard label="Open pipeline" value={money(pipeline)} hint="Awaiting customer decision" icon="trending" tone="violet" />
      </div>
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(q) => q.id}
          onRowClick={(q) => navigate(`/vendor/rfqs/${q.rfq_id}`)}
          empty={<EmptyState icon="file" title="No quotations yet" description="Open an RFQ from your inbox to submit your first quotation." />}
        />
      )}
    </>
  );
}
