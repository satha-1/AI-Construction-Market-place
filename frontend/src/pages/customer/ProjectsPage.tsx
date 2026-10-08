import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { Button, Card, EmptyState, ErrorNote, GeoPattern, Input, LoadingBlock, Modal, PageHeader, SearchInput, StatusBadge, Textarea, useToast, type PatternVariant } from "../../components/ui";
import { dateShort, errorMessage, money } from "../../lib/format";

const patterns: PatternVariant[] = ["blocks", "grid", "circles", "diagonal", "arcs"];

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
        eyebrow="Customer"
        title="Projects"
        description="Each project holds its documents, BOQ, estimate, RFQs and a complete audit trail."
        actions={<Button onClick={() => setOpen(true)}>New project</Button>}
      />
      <SearchInput className="mb-6 max-w-md" value={search} onChange={setSearch} placeholder="Search projects" />
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title={data.length ? "No matching projects" : "No projects yet"} description="Create a project, then upload drawings or BOQ files to begin." action={<Button onClick={() => setOpen(true)}>New project</Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p, i) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="focus-ring block rounded-card">
              <Card hoverable padded={false} className="group h-full overflow-hidden">
                <div className="relative aspect-video border-b border-line bg-soft">
                  <GeoPattern variant={patterns[i % patterns.length]} className="h-full w-full text-subtle transition-transform duration-ui ease-ui group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 transition-opacity duration-ui group-hover:opacity-100" />
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="truncate text-sm font-bold text-ink">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] leading-relaxed text-muted">{p.description || "No description"}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
                    <span>{p.location ?? "—"}</span>
                    <span>{money(p.budget_cap)}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-subtle">Updated {dateShort(p.updated_at)}</p>
                </div>
              </Card>
            </Link>
          ))}
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
