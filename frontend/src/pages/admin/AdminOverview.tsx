import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Card, CardHeader, ErrorNote, Hero, LoadingBlock, StatCard, ButtonLink } from "../../components/ui";

const shortcuts = [
  { to: "/admin/users", title: "Manage users", text: "Roles, activation and access." },
  { to: "/admin/vendors", title: "Moderate vendors", text: "Approve or suspend vendor profiles." },
  { to: "/admin/rates", title: "Reference rates", text: "Tune unit rates used by the estimator." },
  { to: "/admin/audit", title: "Audit trail", text: "Every human and AI action, in order." },
];

export default function AdminOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: api.adminOverview });

  return (
    <>
      <Hero
        pattern="grid"
        eyebrow="Admin console"
        title="Platform overview"
        description="Monitor accounts, vendor activity and the estimation pipeline across the whole marketplace."
        actions={
          <>
            <ButtonLink to="/admin/vendors">Review vendors</ButtonLink>
            <ButtonLink to="/admin/audit" variant="secondary">
              Open audit log
            </ButtonLink>
          </>
        }
      />
      <ErrorNote error={error} />
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Users" value={data.users} hint={`${data.customers} customers · ${data.vendors} vendors · ${data.admins} admins`} pattern="circles" />
            <StatCard label="Projects" value={data.projects} hint={`${data.documents} documents uploaded`} pattern="blocks" />
            <StatCard label="Vendor profiles" value={data.vendor_profiles} hint={`${data.published_items}/${data.catalog_items} items published`} pattern="diagonal" />
            <StatCard label="Open flags" value={data.open_flags} hint="Awaiting human verification" pattern="arcs" />
            <StatCard label="RFQs" value={data.rfqs} pattern="grid" />
            <StatCard label="Quotations" value={data.quotations} pattern="blocks" />
            <StatCard label="Catalog items" value={data.catalog_items} pattern="circles" />
            <StatCard label="Documents" value={data.documents} pattern="diagonal" />
          </div>
          <Card className="mt-8">
            <CardHeader title="Shortcuts" description="Jump to the most common admin tasks." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shortcuts.map((s) => (
                <Link key={s.to} to={s.to} className="rounded-ui border border-line p-4 transition-all duration-ui ease-ui hover:border-ink hover:bg-soft">
                  <p className="text-xs font-bold text-ink">{s.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{s.text}</p>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
