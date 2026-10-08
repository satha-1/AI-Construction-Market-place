import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type RfqSummary } from "../../api";
import { Badge, Button, DataTable, EmptyState, ErrorNote, Input, LoadingBlock, Modal, StatusBadge, useToast, type Column } from "../../components/ui";
import { cx, dateShort, errorMessage, percent } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

export default function RfqsTab() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");

  const rfqs = useQuery({ queryKey: ["rfqs", projectId], queryFn: () => api.rfqs(projectId) });
  const boq = useQuery({ queryKey: ["boq", projectId], queryFn: () => api.boq(projectId) });
  const vendors = useQuery({ queryKey: ["vendors", "all"], queryFn: api.vendors, enabled: open });
  const matches = useMutation({ mutationFn: () => api.vendorSearch(projectId) });

  useEffect(() => {
    if (open) matches.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bestScore = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of matches.data?.matches ?? []) map.set(m.vendor_id, Math.max(map.get(m.vendor_id) ?? 0, m.match_score));
    return map;
  }, [matches.data]);

  const approved = (vendors.data ?? []).filter((v) => !v.status || v.status === "approved");
  const ordered = [...approved].sort((a, b) => (bestScore.get(b.id) ?? -1) - (bestScore.get(a.id) ?? -1));

  const create = useMutation({
    mutationFn: () => api.createRfq(projectId, { vendor_ids: [...selected], deadline: deadline ? new Date(deadline).toISOString() : undefined }),
    onSuccess: (rfq) => {
      toast.success("RFQ sent to selected vendors");
      qc.invalidateQueries({ queryKey: ["rfqs", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setOpen(false);
      setSelected(new Set());
      navigate(`/projects/${projectId}/rfqs/${rfq.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasBoq = (boq.data?.items.length ?? 0) > 0;
  const columns: Column<RfqSummary>[] = [
    { key: "id", header: "RFQ", render: (r) => <span className="font-bold">#{r.id.slice(0, 8)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "lines", header: "Items", align: "right", render: (r) => r.line_count },
    { key: "vendors", header: "Vendors", align: "right", render: (r) => r.vendor_count ?? 0 },
    { key: "quotes", header: "Quotations", align: "right", render: (r) => r.quotation_count ?? 0 },
    { key: "deadline", header: "Deadline", render: (r) => <span className="text-muted">{dateShort(r.deadline)}</span> },
    { key: "created", header: "Created", render: (r) => <span className="text-muted">{dateShort(r.created_at)}</span> },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-relaxed text-muted">Send your BOQ to vendors, compare their quotations side by side and pick a winner. Selection is always a human decision.</p>
        <Button disabled={!hasBoq} onClick={() => setOpen(true)} title={hasBoq ? undefined : "Generate a BOQ first"}>
          New RFQ
        </Button>
      </div>
      <ErrorNote error={rfqs.error} />
      {rfqs.isLoading ? (
        <LoadingBlock />
      ) : (
        <DataTable
          columns={columns}
          rows={rfqs.data ?? []}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/projects/${projectId}/rfqs/${r.id}`)}
          empty={<EmptyState pattern="arcs" title="No RFQs yet" description={hasBoq ? "Create an RFQ to request quotations from vendors." : "Generate a BOQ first, then request quotations."} />}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New request for quotation"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} disabled={selected.size === 0} onClick={() => create.mutate()}>
              Send to {selected.size || "…"} vendor{selected.size === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-xs text-muted">All {boq.data?.items.length ?? 0} BOQ items will be included. Vendors are ranked by how well their catalog matches your BOQ.</p>
        <Input label="Quote deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} wrapperClassName="mb-5 max-w-xs" />
        {vendors.isLoading || matches.isPending ? <LoadingBlock label="Matching vendors" /> : null}
        <ErrorNote error={vendors.error} />
        <ul className="space-y-2">
          {ordered.map((v) => {
            const on = selected.has(v.id);
            const score = bestScore.get(v.id);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(v.id)}
                  className={cx(
                    "focus-ring flex min-h-[44px] w-full items-center justify-between gap-3 rounded-ui border px-4 py-3 text-left transition-colors duration-ui",
                    on ? "border-accent bg-accent-soft" : "border-line hover:border-subtle",
                  )}
                >
                  <span>
                    <span className="block text-xs font-bold text-ink">{v.company_name}</span>
                    <span className="block text-[11px] text-muted">{[v.category, v.location].filter(Boolean).join(" · ") || "—"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {score !== undefined ? <Badge tone="success">Match {percent(score)}</Badge> : null}
                    <span className={cx("flex h-5 w-5 items-center justify-center rounded-ui border text-[10px]", on ? "border-accent bg-accent text-accent-fg" : "border-line")}>{on ? "✓" : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {!vendors.isLoading && ordered.length === 0 ? <li className="py-6 text-center text-xs text-muted">No approved vendors available yet.</li> : null}
        </ul>
      </Modal>
    </>
  );
}
