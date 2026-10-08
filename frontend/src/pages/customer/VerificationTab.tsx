import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Flag } from "../../api";
import { Badge, Button, Card, EmptyState, ErrorNote, Input, LoadingBlock, Modal, useToast } from "../../components/ui";
import { errorMessage, percent, titleCase } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

export default function VerificationTab() {
  const projectId = useProjectId();
  const qc = useQueryClient();
  const toast = useToast();
  const [correcting, setCorrecting] = useState<Flag | null>(null);
  const [value, setValue] = useState("1");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["flags", projectId], queryFn: () => api.verification(projectId) });

  const act = useMutation({
    mutationFn: ({ flag, action, body }: { flag: Flag; action: "approve" | "reject" | "correct"; body?: { new_value?: Record<string, unknown>; comment?: string } }) =>
      api.verifyAction(flag.id, action, body),
    onSuccess: (_d, v) => {
      toast.success(`Flag ${v.action === "correct" ? "corrected" : v.action + "d"}`);
      setCorrecting(null);
      qc.invalidateQueries({ queryKey: ["flags", projectId] });
      qc.invalidateQueries({ queryKey: ["boq", projectId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <LoadingBlock />;
  return (
    <>
      <p className="mb-6 max-w-2xl text-xs leading-relaxed text-muted">
        The assistant never finalises uncertain values on its own. Approve, correct or reject each flagged item — every decision is written to the audit log.
      </p>
      <ErrorNote error={error} />
      {data.length === 0 ? (
        <EmptyState pattern="circles" title="Nothing to verify" description="No open uncertainty flags for this project." />
      ) : (
        <ul className="space-y-3">
          {data.map((flag) => (
            <li key={flag.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">{titleCase(flag.entity_type)}</Badge>
                    <span className="text-[11px] text-muted">Confidence {percent(flag.confidence_score)}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-ink">{flag.reason}</p>
                  <p className="mt-0.5 truncate text-[10px] text-subtle">{flag.entity_id}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act.mutate({ flag, action: "approve" })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCorrecting(flag)}>
                    Correct
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => act.mutate({ flag, action: "reject" })}>
                    Reject
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        title="Correct value"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCorrecting(null)}>
              Cancel
            </Button>
            <Button
              loading={act.isPending}
              disabled={value === "" || Number.isNaN(Number(value))}
              onClick={() => correcting && act.mutate({ flag: correcting, action: "correct", body: { new_value: { quantity: Number(value) }, comment: "Corrected in UI" } })}
            >
              Save correction
            </Button>
          </>
        }
      >
        <p className="mb-4 text-xs text-muted">{correcting?.reason}</p>
        <Input label="Corrected quantity" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
      </Modal>
    </>
  );
}
