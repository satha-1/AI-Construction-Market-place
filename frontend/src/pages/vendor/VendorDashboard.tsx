import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Icon } from "../../components/Icon";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, ErrorNote, Hero, IconTile, LoadingBlock, StatCard, StatusBadge } from "../../components/ui";
import { dateShort } from "../../lib/format";

export default function VendorDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard", "vendor"], queryFn: api.vendorDashboard });
  if (isLoading || !data) return <LoadingBlock />;
  if (!data.vendor) return null;

  const t = data.totals;
  const publishedShare = t.catalog_items ? Math.round((t.published / t.catalog_items) * 100) : 0;
  const winRate = t.quotations ? Math.round((t.won / t.quotations) * 100) : 0;

  return (
    <>
      <Hero
        icon="store"
        eyebrow="Vendor portal"
        title={data.vendor.company_name}
        description="Keep your catalog current and respond quickly to RFQs — customers see only published, approved items."
        actions={
          <>
            <ButtonLink to="/vendor/catalog" icon="box">
              Manage catalog
            </ButtonLink>
            <ButtonLink to="/vendor/rfqs" variant="secondary" icon="inbox">
              Open RFQ inbox
            </ButtonLink>
            <StatusBadge status={data.vendor.status} />
          </>
        }
      />
      <ErrorNote error={error} />
      {data.vendor.status !== "approved" ? (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50/60 p-4">
          <IconTile icon="clock" tone="amber" size="sm" />
          <p className="text-sm text-amber-900">
            Your company is <span className="font-semibold">{data.vendor.status}</span>. Items become visible in the marketplace once an administrator approves your account.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog items" value={t.catalog_items} hint={`${t.published} published · ${t.drafts} drafts`} icon="box" tone="teal" />
        <StatCard label="RFQs received" value={t.rfqs} icon="inbox" tone="blue" />
        <StatCard label="Awaiting quote" value={t.awaiting_quote} hint="Open RFQs you haven't quoted" icon="clock" tone="amber" />
        <StatCard label="Quotations won" value={t.won} hint={`${t.quotations} submitted`} icon="award" tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            icon="inbox"
            tone="blue"
            title="Recent RFQs"
            action={
              <Link to="/vendor/rfqs" className="text-sm font-semibold text-accent hover:underline">
                View all
              </Link>
            }
          />
          {data.recent_rfqs.length === 0 ? (
            <EmptyState icon="inbox" tone="blue" title="No RFQs yet" description="Publish catalog items so customers can discover and invite you." />
          ) : (
            <ul className="-mx-2 space-y-1">
              {data.recent_rfqs.map((r) => (
                <li key={r.id}>
                  <Link to={`/vendor/rfqs/${r.id}`} className="focus-ring group flex items-center gap-3 rounded-ui px-2 py-2.5 transition-colors hover:bg-soft">
                    <IconTile icon={r.has_quoted ? "checkCircle" : "inbox"} tone={r.has_quoted ? "emerald" : "blue"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">RFQ #{r.id.slice(0, 8)}</p>
                      <p className="truncate text-xs text-muted">
                        Received {dateShort(r.created_at)} · deadline {dateShort(r.deadline)}
                      </p>
                    </div>
                    <div className="hidden gap-2 sm:flex">
                      <StatusBadge status={r.status} />
                      <Badge tone={r.has_quoted ? "success" : "warning"}>{r.has_quoted ? "Quoted" : "Awaiting quote"}</Badge>
                    </div>
                    <Icon name="chevron" className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon="trending" tone="emerald" title="Performance" description="How your storefront is doing" />
          <div className="space-y-5">
            <Meter label="Catalog published" value={publishedShare} bar="bg-teal-500" />
            <Meter label="Quotation win rate" value={winRate} bar="bg-violet-500" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ButtonLink to="/vendor/quotations" variant="soft" icon="file" className="w-full">
              Quotations
            </ButtonLink>
            <ButtonLink to="/vendor/profile" variant="secondary" icon="building" className="w-full">
              Profile
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}

function Meter({ label, value, bar }: { label: string; value: number; bar: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-ink">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-soft">
        <div className={`h-full rounded-full transition-all duration-ui ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
