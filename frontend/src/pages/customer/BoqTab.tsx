import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type BoqItem } from "../../api";
import { Badge, Button, Card, DataTable, EmptyState, ErrorNote, Input, LoadingBlock, Modal, StatCard, useToast, type Column } from "../../components/ui";
import { errorMessage, money, percent, qty } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

export default function BoqTab() {
  const projectId = useProjectId();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<BoqItem | null>(null);
  const [value, setValue] = useState("");

  const boq = useQuery({ queryKey: ["boq", projectId], queryFn: () => api.boq(projectId) });
  const estimate = useQuery({ queryKey: ["estimate", projectId], queryFn: () => api.estimate(projectId) });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["boq", projectId] });
    qc.invalidateQueries({ queryKey: ["estimate", projectId] });
    qc.invalidateQueries({ queryKey: ["flags", projectId] });
    qc.invalidateQueries({ queryKey: ["project", projectId] });
  };

  const generate = useMutation({
    mutationFn: () => api.generateBoq(projectId),
    onSuccess: () => {
      toast.success("BOQ generated from processed documents");
      refreshAll();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const calculate = useMutation({
    mutationFn: () => api.calculateEstimate(projectId),
    onSuccess: () => {
      toast.success("Estimate calculated");
      refreshAll();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const save = useMutation({
    mutationFn: () => api.updateBoqItem(editing!.id, { quantity: Number(value), is_verified: true }),
    onSuccess: () => {
      toast.success("Quantity corrected — recalculate the estimate to refresh costs");
      setEditing(null);
      refreshAll();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const lineByItem = useMemo(() => new Map((estimate.data?.line_items ?? []).map((l) => [l.boq_item_id, l])), [estimate.data]);
  const items = boq.data?.items ?? [];
  const total = estimate.data?.estimate;

  const columns: Column<BoqItem>[] = [
    { key: "name", header: "Item", render: (i) => <span className="font-bold">{i.item_name}</span> },
    { key: "cat", header: "Category", render: (i) => <span className="text-muted">{i.category ?? "—"}</span> },
    { key: "qty", header: "Qty", align: "right", render: (i) => `${qty(i.quantity)} ${i.unit ?? ""}` },
    { key: "rate", header: "Unit rate", align: "right", render: (i) => (lineByItem.get(i.id) ? money(lineByItem.get(i.id)!.unit_rate) : "—") },
    { key: "total", header: "Line total", align: "right", render: (i) => <span className="font-bold">{lineByItem.get(i.id) ? money(lineByItem.get(i.id)!.line_total) : "—"}</span> },
    {
      key: "conf",
      header: "Confidence",
      render: (i) =>
        i.is_verified ? <Badge tone="success">Verified</Badge> : <Badge tone={Number(i.confidence_score ?? 0) < 0.7 ? "warning" : "neutral"}>{percent(i.confidence_score)}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (i) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditing(i);
            setValue(String(i.quantity ?? ""));
          }}
        >
          Correct
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-relaxed text-muted">
          Quantities and costs are computed deterministically from reference rates. Low-confidence items are flagged for human verification.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" loading={generate.isPending} onClick={() => generate.mutate()}>
            {boq.data?.boq ? "Regenerate BOQ" : "Generate BOQ"}
          </Button>
          <Button loading={calculate.isPending} disabled={items.length === 0} onClick={() => calculate.mutate()}>
            Calculate estimate
          </Button>
        </div>
      </div>

      <ErrorNote error={boq.error ?? estimate.error} />
      {boq.isLoading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="BOQ items" value={items.length} hint={boq.data?.boq ? `Version ${boq.data.boq.version} · ${boq.data.boq.status}` : "Not generated"} pattern="blocks" />
            <StatCard label="Verified items" value={items.filter((i) => i.is_verified).length} pattern="grid" />
            <StatCard label="Estimated total" value={total ? money(total.total_cost, total.currency) : "—"} hint={total ? `Estimate v${total.version ?? 1}` : "Not calculated"} pattern="arcs" />
          </div>
          <Card padded={false} className="border-0 bg-transparent">
            <DataTable
              columns={columns}
              rows={items}
              rowKey={(i) => i.id}
              empty={<EmptyState pattern="blocks" title="No BOQ yet" description="Upload and process documents, then generate a BOQ to see itemised quantities." />}
            />
          </Card>
        </>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Correct quantity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={save.isPending} disabled={value === "" || Number(value) < 0} onClick={() => save.mutate()}>
              Save correction
            </Button>
          </>
        }
      >
        <p className="mb-4 text-xs text-muted">{editing?.item_name}</p>
        <Input label={`Quantity (${editing?.unit ?? "unit"})`} type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
      </Modal>
    </>
  );
}
