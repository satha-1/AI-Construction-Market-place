import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Icon, type IconName } from "../../components/Icon";
import { ButtonLink, Card, CardHeader, EmptyState, ErrorNote, Hero, IconTile, LoadingBlock, StatCard, StatusBadge, type Tone } from "../../components/ui";
import { dateShort, money, timeAgo, titleCase } from "../../lib/format";
import { toneFor } from "../../lib/visuals";

const steps: { icon: IconName; tone: Tone; title: string; text: string }[] = [
  { icon: "upload", tone: "teal", title: "Upload drawings", text: "PDF plans, BOQ sheets or specs" },
  { icon: "calculator", tone: "violet", title: "Review the BOQ", text: "AI quantities with confidence scores" },
  { icon: "inbox", tone: "blue", title: "Request quotations", text: "Send RFQs to verified vendors" },
  { icon: "award", tone: "amber", title: "Pick the best offer", text: "Compare price, lead time & terms" },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard", "customer"], queryFn: api.customerDashboard });

  return (
    <>
      <Hero
        icon="briefcase"
        eyebrow="Customer workspace"
        title={`Welcome back, ${user?.full_name.split(" ")[0] ?? ""}`}
        description="Upload drawings, review the AI-generated BOQ, then request and compare quotations from verified vendors."
        actions={
          <>
            <ButtonLink to="/projects" icon="folder">
              Open projects
            </ButtonLink>
            <ButtonLink to="/marketplace" variant="secondary" icon="store">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projects" value={data.totals.projects} icon="folder" tone="teal" />
            <StatCard label="Documents" value={data.totals.documents} icon="file" tone="blue" />
            <StatCard label="Open flags" value={data.totals.open_flags} hint="Need human verification" icon="alert" tone="amber" />
            <StatCard label="Open RFQs" value={data.totals.open_rfqs} hint={`${data.totals.quotations} quotations received`} icon="inbox" tone="violet" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                icon="folder"
                tone="teal"
                title="Recent projects"
                action={
                  <Link to="/projects" className="text-sm font-semibold text-accent hover:underline">
                    View all
                  </Link>
                }
              />
              {data.recent_projects.length === 0 ? (
                <EmptyState icon="folder" title="No projects yet" description="Create your first project to start estimating." action={<ButtonLink to="/projects" icon="plus">Create project</ButtonLink>} />
              ) : (
                <ul className="-mx-2 space-y-1">
                  {data.recent_projects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="focus-ring group flex items-center gap-3 rounded-ui px-2 py-2.5 transition-colors hover:bg-soft">
                        <IconTile icon="building" tone={toneFor(p.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                          <p className="truncate text-xs text-muted">
                            {p.location ?? "No location"} · {money(p.budget_cap)} · updated {dateShort(p.updated_at)}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                        <Icon name="chevron" className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader icon="clock" tone="emerald" title="Recent activity" description="Latest actions on your projects" />
              {data.activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="space-y-4">
                  {data.activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <IconTile icon={a.actor_type === "ai" ? "sparkles" : "user"} tone={a.actor_type === "ai" ? "violet" : "teal"} size="sm" round />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{titleCase(a.action)}</p>
                        <p className="truncate text-xs text-muted">
                          {a.actor_type === "ai" ? "AI" : "You"} · {titleCase(a.entity_type)} · {timeAgo(a.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader icon="sparkles" tone="violet" title="How estimating works" description="From drawings to the best quotation in four steps" />
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3 rounded-ui bg-soft p-4">
                  <IconTile icon={s.icon} tone={s.tone} round />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-subtle">Step {i + 1}</p>
                    <p className="text-sm font-semibold text-ink">{s.title}</p>
                    <p className="text-xs text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </>
  );
}
