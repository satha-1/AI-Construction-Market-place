import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { ButtonLink, Card, CardHeader, EmptyState, ErrorNote, Hero, LoadingBlock, StatCard, StatusBadge } from "../../components/ui";
import { dateShort, money, timeAgo, titleCase } from "../../lib/format";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard", "customer"], queryFn: api.customerDashboard });

  return (
    <>
      <Hero
        pattern="blocks"
        eyebrow="Customer workspace"
        title={`Welcome back, ${user?.full_name.split(" ")[0] ?? ""}`}
        description="Upload drawings, review the AI-generated BOQ, then request and compare quotations from verified vendors."
        actions={
          <>
            <ButtonLink to="/projects">Open projects</ButtonLink>
            <ButtonLink to="/marketplace" variant="secondary">
              Browse marketplace
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
            <StatCard label="Projects" value={data.totals.projects} pattern="blocks" />
            <StatCard label="Documents" value={data.totals.documents} pattern="grid" />
            <StatCard label="Open flags" value={data.totals.open_flags} hint="Need human verification" pattern="arcs" />
            <StatCard label="Open RFQs" value={data.totals.open_rfqs} hint={`${data.totals.quotations} quotations received`} pattern="diagonal" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Recent projects" action={<Link to="/projects" className="text-[11px] font-bold hover:underline">View all</Link>} />
              {data.recent_projects.length === 0 ? (
                <EmptyState title="No projects yet" description="Create your first project to start estimating." action={<ButtonLink to="/projects">Create project</ButtonLink>} />
              ) : (
                <ul className="divide-y divide-line">
                  {data.recent_projects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-soft">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">{p.name}</p>
                          <p className="text-[11px] text-muted">
                            {p.location ?? "No location"} · {money(p.budget_cap)} · updated {dateShort(p.updated_at)}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent activity" description="Latest actions on your projects" />
              {data.activity.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">No activity yet.</p>
              ) : (
                <ul className="space-y-4">
                  {data.activity.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <div>
                        <p className="text-xs font-bold text-ink">{titleCase(a.action)}</p>
                        <p className="text-[11px] text-muted">
                          {a.actor_type} · {a.entity_type} · {timeAgo(a.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
