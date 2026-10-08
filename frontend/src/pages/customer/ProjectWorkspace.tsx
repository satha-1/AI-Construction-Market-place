import { useQuery } from "@tanstack/react-query";
import { Outlet, useParams } from "react-router-dom";
import { api } from "../../api";
import { ErrorNote, LoadingBlock, PageHeader, RouteTabs, StatusBadge } from "../../components/ui";
import { money } from "../../lib/format";

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
        eyebrow={`Project · ${project.location ?? "No location"}`}
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Budget {money(project.budget_cap)}</span>
            <StatusBadge status={project.status} />
          </div>
        }
      />
      <RouteTabs
        items={[
          { to: base, label: "Documents" },
          { to: `${base}/boq`, label: "BOQ & estimate" },
          { to: `${base}/verification`, label: "Verification", badge: flags.length },
          { to: `${base}/rfqs`, label: "RFQs" },
          { to: `${base}/agent`, label: "Assistant" },
          { to: `${base}/audit`, label: "Audit" },
        ]}
      />
      <div className="pt-6">
        <Outlet />
      </div>
    </>
  );
}
