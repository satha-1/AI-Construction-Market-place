import { useQuery } from "@tanstack/react-query";
import { Outlet, useParams } from "react-router-dom";
import { api } from "../../api";
import { Icon } from "../../components/Icon";
import { ErrorNote, LoadingBlock, PageHeader, RouteTabs, StatusBadge } from "../../components/ui";
import { money } from "../../lib/format";
import { toneFor } from "../../lib/visuals";

export function useProjectId() {
  return useParams().projectId ?? "";
}

export default function ProjectWorkspace() {
  const projectId = useProjectId();
  const { data: project, error } = useQuery({ queryKey: ["project", projectId], queryFn: () => api.project(projectId) });
  const { data: flags = [] } = useQuery({ queryKey: ["flags", projectId], queryFn: () => api.verification(projectId) });
  const base = `/projects/${projectId}`;

  if (error) return <ErrorNote error={error} />;
  if (!project) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        icon="building"
        tone={toneFor(project.id)}
        eyebrow={project.location ?? "No location"}
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-line">
              <Icon name="tag" className="h-4 w-4 text-accent" />
              Budget {money(project.budget_cap)}
            </span>
            <StatusBadge status={project.status} />
          </div>
        }
      />
      <RouteTabs
        items={[
          { to: base, label: "Documents", icon: "file" },
          { to: `${base}/boq`, label: "BOQ & estimate", icon: "calculator" },
          { to: `${base}/verification`, label: "Verification", icon: "alert", badge: flags.length },
          { to: `${base}/rfqs`, label: "RFQs", icon: "inbox" },
          { to: `${base}/agent`, label: "Assistant", icon: "sparkles" },
          { to: `${base}/audit`, label: "Audit", icon: "shieldCheck" },
        ]}
      />
      <div className="pt-6">
        <Outlet />
      </div>
    </>
  );
}
