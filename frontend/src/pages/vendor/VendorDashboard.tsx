import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, ErrorNote, Hero, LoadingBlock, StatCard, StatusBadge } from "../../components/ui";
import { dateShort, titleCase } from "../../lib/format";

export default function VendorDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard", "vendor"], queryFn: api.vendorDashboard });
  if (isLoading || !data) return <LoadingBlock />;
  if (!data.vendor) return null;

  return (
    <>
      <Hero
        pattern="arcs"
        eyebrow="Vendor portal"
        title={data.vendor.company_name}
        description="Keep your catalog current and respond quickly to RFQs — customers see only published, approved items."
        actions={
          <>
            <ButtonLink to="/vendor/catalog">Manage catalog</ButtonLink>
            <ButtonLink to="/vendor/rfqs" variant="secondary">
              Open RFQ inbox
            </ButtonLink>
            <StatusBadge status={data.vendor.status} />
          </>
        }
      />
      <ErrorNote error={error} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Catalog items" value={data.totals.catalog_items} hint={`${data.totals.published} published · ${data.totals.drafts} drafts`} pattern="blocks" />
        <StatCard label="RFQs received" value={data.totals.rfqs} pattern="grid" />
        <StatCard label="Awaiting quote" value={data.totals.awaiting_quote} hint="Open RFQs you haven't quoted" pattern="diagonal" />
        <StatCard label="Quotations won" value={data.totals.won} hint={`${data.totals.quotations} submitted`} pattern="arcs" />
      </div>

      <Card className="mt-8">
        <CardHeader title="Recent RFQs" action={<Link to="/vendor/rfqs" className="text-[11px] font-bold hover:underline">View all</Link>} />
        {data.recent_rfqs.length === 0 ? (
          <EmptyState title="No RFQs yet" description="Publish catalog items so customers can discover and invite you." />
        ) : (
          <ul className="divide-y divide-line">
            {data.recent_rfqs.map((r) => (
              <li key={r.id}>
                <Link to={`/vendor/rfqs/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-soft">
                  <div>
                    <p className="text-xs font-bold text-ink">RFQ #{r.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted">Received {dateShort(r.created_at)} · deadline {dateShort(r.deadline)}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={r.status} />
                    <Badge tone={r.has_quoted ? "success" : "warning"}>{r.has_quoted ? "Quoted" : titleCase("awaiting quote")}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
