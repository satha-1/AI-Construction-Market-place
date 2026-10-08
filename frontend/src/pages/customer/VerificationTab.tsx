import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Flag } from "../../api";
import { Badge, Button, Card, EmptyState, ErrorNote, IconTile, Input, LoadingBlock, Modal, useToast } from "../../components/ui";
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
      <div className="mb-6 flex max-w-3xl items-start gap-3 rounded-card border border-amber-200 bg-amber-50/60 p-4">
        <IconTile icon="shieldCheck" tone="amber" size="sm" />
        <p className="text-sm text-amber-900">
          The assistant never finalises uncertain values on its own. Approve, correct or reject each flagged item — every decision is written to the audit log.
        </p>
      </div>
      <ErrorNote error={error} />
      {data.length === 0 ? (
        <EmptyState icon="checkCircle" tone="emerald" title="Nothing to verify" description="No open uncertainty flags for this project." />
      ) : (
        <ul className="space-y-3">
          {data.map((flag) => (
            <li key={flag.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <IconTile icon="alert" tone="amber" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{titleCase(flag.entity_type)}</Badge>
                      <Badge tone="info" icon="sparkles">
                        Confidence {percent(flag.confidence_score)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink">{flag.reason}</p>
                    <p className="mt-0.5 truncate text-xs text-subtle">{flag.entity_id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" icon="check" onClick={() => act.mutate({ flag, action: "approve" })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" icon="edit" onClick={() => setCorrecting(flag)}>
                    Correct
                  </Button>
                  <Button size="sm" variant="danger" icon="close" onClick={() => act.mutate({ flag, action: "reject" })}>
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
        <p className="mb-4 text-sm text-muted">{correcting?.reason}</p>
        <Input label="Corrected quantity" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
      </Modal>
    </>
  );
}
