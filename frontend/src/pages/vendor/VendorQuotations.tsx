import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type VendorQuotationRow } from "../../api";
import { DataTable, EmptyState, ErrorNote, LoadingBlock, PageHeader, StatusBadge, type Column } from "../../components/ui";
import { dateTime, money } from "../../lib/format";
import { useVendor } from "./useVendor";

export default function VendorQuotations() {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["vendor", "quotations", vendor?.id], queryFn: () => api.vendorQuotations(vendor!.id), enabled: !!vendor });

  const columns: Column<VendorQuotationRow>[] = [
    { key: "rfq", header: "RFQ", render: (q) => <span className="font-bold">#{q.rfq_id.slice(0, 8)}</span> },
    { key: "total", header: "Total", align: "right", render: (q) => money(q.total_price, q.currency) },
    { key: "status", header: "Quotation", render: (q) => <StatusBadge status={q.status} /> },
    { key: "rfqStatus", header: "RFQ status", render: (q) => (q.rfq_status ? <StatusBadge status={q.rfq_status} /> : "—") },
    { key: "date", header: "Submitted", render: (q) => <span className="text-muted">{dateTime(q.submitted_at)}</span> },
  ];

  return (
    <>
      <PageHeader eyebrow="Vendor" title="My quotations" description="Everything you've submitted, and whether it was selected." />
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : <DataTable columns={columns} rows={data} rowKey={(q) => q.id} onRowClick={(q) => navigate(`/vendor/rfqs/${q.rfq_id}`)} empty={<EmptyState pattern="grid" title="No quotations yet" description="Open an RFQ from your inbox to submit your first quotation." />} />}
    </>
  );
}
