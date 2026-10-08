import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { Icon } from "../../components/Icon";
import { Button, Card, EmptyState, ErrorNote, IconTile, Input, LoadingBlock, Modal, PageHeader, SearchInput, StatusBadge, Textarea, useToast } from "../../components/ui";
import { dateShort, errorMessage, money } from "../../lib/format";
import { toneFor } from "../../lib/visuals";

export default function ProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", location: "", budget: "" });
  const { data = [], isLoading, error } = useQuery({ queryKey: ["projects"], queryFn: api.projects });

  const create = useMutation({
    mutationFn: () =>
      api.createProject({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        budget_cap: form.budget ? Number(form.budget) : undefined,
      }),
    onSuccess: (project) => {
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ name: "", description: "", location: "", budget: "" });
      navigate(`/projects/${project.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((p) => !term || p.name.toLowerCase().includes(term) || (p.location ?? "").toLowerCase().includes(term));
  }, [data, search]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim()) create.mutate();
  }

  return (
    <>
      <PageHeader
        icon="folder"
        title="Projects"
        description="Each project holds its documents, BOQ, estimate, RFQs and a complete audit trail."
        actions={
          <>
            <SearchInput className="w-full sm:w-64" value={search} onChange={setSearch} placeholder="Search projects" />
            <Button icon="plus" onClick={() => setOpen(true)}>
              New project
            </Button>
          </>
        }
      />
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="folder"
          title={data.length ? "No matching projects" : "No projects yet"}
          description="Create a project, then upload drawings or BOQ files to begin."
          action={
            <Button icon="plus" onClick={() => setOpen(true)}>
              New project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const tone = toneFor(p.id);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="focus-ring block rounded-card">
                <Card hoverable className="group flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <IconTile icon="building" tone={tone} size="lg" className="transition-transform duration-ui ease-ui group-hover:scale-105" />
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 className="mt-4 truncate text-base font-bold text-ink">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted">{p.description || "No description"}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 text-muted">
                      <Icon name="pin" className="h-4 w-4 shrink-0 text-subtle" />
                      <span className="truncate">{p.location ?? "No location"}</span>
                    </span>
                    <span className="flex items-center justify-end gap-1.5 font-semibold text-ink">
                      <Icon name="tag" className="h-4 w-4 text-subtle" />
                      {money(p.budget_cap)}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    Updated {dateShort(p.updated_at)}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} disabled={!form.name.trim()} onClick={() => create.mutate()}>
              Create project
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Project name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Riverside Apartments – Block B" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Budget cap (USD)" type="number" min="0" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </>
  );
}
