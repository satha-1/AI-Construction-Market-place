import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Icon, type IconName } from "../../components/Icon";
import { Badge, BarList, ButtonLink, Card, CardHeader, ErrorNote, Hero, IconTile, LoadingBlock, StatCard } from "../../components/ui";
import { timeAgo, titleCase } from "../../lib/format";
import type { Tone } from "../../lib/visuals";

const shortcuts: { to: string; title: string; text: string; icon: IconName; tone: Tone }[] = [
  { to: "/admin/users", title: "Manage users", text: "Roles and account access", icon: "users", tone: "teal" },
  { to: "/admin/vendors", title: "Moderate vendors", text: "Approve or suspend profiles", icon: "store", tone: "blue" },
  { to: "/admin/rates", title: "Reference rates", text: "Tune estimator unit rates", icon: "calculator", tone: "violet" },
  { to: "/admin/audit", title: "Audit trail", text: "Every human & AI action", icon: "shieldCheck", tone: "emerald" },
];

export default function AdminOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: api.adminOverview });
  const activity = useQuery({ queryKey: ["admin", "audit", "recent"], queryFn: () => api.adminAudit({ limit: 6 }) });

  return (
    <>
      <Hero
        icon="shieldCheck"
        eyebrow="Admin console"
        title="Platform overview"
        description="Monitor accounts, vendor activity and the estimation pipeline across the whole marketplace."
        actions={
          <>
            <ButtonLink to="/admin/vendors" icon="store">
              Review vendors
            </ButtonLink>
            <ButtonLink to="/admin/audit" variant="secondary" icon="shieldCheck">
              Audit log
            </ButtonLink>
          </>
        }
      />
      <ErrorNote error={error} />
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="users" tone="teal" label="Total users" value={data.users} hint={`${data.customers} customers · ${data.vendors} vendors`} />
            <StatCard icon="folder" tone="blue" label="Projects" value={data.projects} hint={`${data.documents} documents uploaded`} />
            <StatCard icon="store" tone="violet" label="Vendor profiles" value={data.vendor_profiles} hint={`${data.published_items} items published`} />
            <StatCard icon="alert" tone="amber" label="Open flags" value={data.open_flags} hint="Awaiting human verification" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader icon="users" tone="teal" title="Users by role" />
              <BarList
                items={[
                  { label: "Customers", value: data.customers, tone: "teal" },
                  { label: "Vendors", value: data.vendors, tone: "blue" },
                  { label: "Admins", value: data.admins, tone: "violet" },
                ]}
              />
            </Card>

            <Card>
              <CardHeader icon="trending" tone="blue" title="Marketplace activity" />
              <ul className="space-y-3">
                {[
                  { icon: "box" as const, tone: "teal" as const, label: "Catalog items", value: data.catalog_items, sub: `${data.published_items} published` },
                  { icon: "inbox" as const, tone: "blue" as const, label: "RFQs sent", value: data.rfqs },
                  { icon: "file" as const, tone: "violet" as const, label: "Quotations", value: data.quotations },
                ].map((r) => (
                  <li key={r.label} className="flex items-center gap-3 rounded-ui bg-soft px-3 py-2.5">
                    <IconTile icon={r.icon} tone={r.tone} size="sm" round />
                    <span className="flex-1 text-sm font-medium text-ink">
                      {r.label}
                      {r.sub ? <span className="block text-xs font-normal text-muted">{r.sub}</span> : null}
                    </span>
                    <span className="text-lg font-bold text-ink">{r.value}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                icon="clock"
                tone="emerald"
                title="Recent activity"
                action={
                  <Link to="/admin/audit" className="text-sm font-semibold text-accent hover:underline">
                    View all
                  </Link>
                }
              />
              {(activity.data?.items ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="space-y-4">
                  {activity.data!.items.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <span className={a.actor_type === "ai" ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600" : "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600"}>
                        <Icon name={a.actor_type === "ai" ? "sparkles" : "user"} className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{titleCase(a.action)}</p>
                        <p className="truncate text-xs text-muted">
                          {a.user_email ?? "system"} · {timeAgo(a.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold text-ink">Quick actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {shortcuts.map((s) => (
                <Link key={s.to} to={s.to} className="focus-ring group card-hover flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
                  <IconTile icon={s.icon} tone={s.tone} size="md" round />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{s.title}</span>
                    <span className="block text-xs text-muted">{s.text}</span>
                  </span>
                  <Icon name="arrowRight" className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>

          {data.open_flags > 0 ? (
            <div className="flex items-center gap-3 rounded-card border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              <Icon name="alert" className="h-5 w-5 shrink-0" />
              <span className="flex-1">
                <strong>{data.open_flags}</strong> uncertainty flag{data.open_flags === 1 ? "" : "s"} across projects are waiting for human verification.
              </span>
              <Badge tone="warning">Needs review</Badge>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
