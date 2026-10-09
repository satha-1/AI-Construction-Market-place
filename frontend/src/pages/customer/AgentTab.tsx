import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type AgentRunSummary } from "../../api";
import { Icon } from "../../components/Icon";
import { Button, Card, CardHeader, EmptyState, ErrorNote, IconTile, Input, Spinner, StatusBadge } from "../../components/ui";
import { cx, timeAgo } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

type Message = { role: "you" | "assistant"; text: string; status?: string };
type Tool = {
  tool_name?: string;
  name?: string;
  status?: string;
  latency_ms?: number;
  output_result?: { success?: boolean; citations?: unknown[]; data?: { chunks?: { citation?: unknown; content?: string }[] } };
};

const suggestions = ["Analyze documents and generate BOQ with costs", "Search vendors for my BOQ items", "What items need verification?", "Compare quotations on my latest RFQ"];

export default function AgentTab() {
  const projectId = useProjectId();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<Message[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const runs = useQuery({ queryKey: ["agent-runs", projectId], queryFn: () => api.agentRuns(projectId) });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const run = await api.agentMessage(projectId, text);
      const trace = await api.agentTools(run.id).catch(() => []);
      return { run, trace };
    },
    onSuccess: ({ run, trace }) => {
      setLog((prev) => [...prev, { role: "assistant", text: run.final_response, status: run.status }]);
      setTools(trace);
      setActiveRunId(run.id);
      ["boq", "estimate", "flags", "project", "documents", "audit", "agent-runs"].forEach((k) => qc.invalidateQueries({ queryKey: [k, projectId] }));
    },
  });

  const loadRun = useMutation({
    mutationFn: async (run: AgentRunSummary) => {
      const trace = await api.agentTools(run.id).catch(() => []);
      return { run, trace };
    },
    onSuccess: ({ run, trace }) => {
      setActiveRunId(run.id);
      setTools(trace);
      setLog([
        { role: "you", text: run.user_message },
        { role: "assistant", text: run.final_response ?? "No response recorded.", status: run.status },
      ]);
    },
  });

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [log, send.isPending]);

  function submit(event: FormEvent, preset?: string) {
    event.preventDefault();
    const text = (preset ?? message).trim();
    if (!text || send.isPending) return;
    setMessage("");
    setLog((prev) => [...prev, { role: "you", text }]);
    send.mutate(text);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card padded={false} className="flex min-h-[28rem] flex-col bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {log.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <IconTile icon="sparkles" tone="violet" size="xl" round />
              <p className="mt-4 text-base font-bold text-ink">Ask the construction assistant</p>
              <p className="mt-1 max-w-md text-sm text-muted">It reads your documents, builds a BOQ, calculates costs and finds vendors. It flags anything uncertain.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => submit(e, s)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-teal-700"
                  >
                    <Icon name="bolt" className="h-3.5 w-3.5" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {log.map((m, i) => (
            <div key={i} className={cx("flex items-end gap-2", m.role === "you" && "flex-row-reverse")}>
              <IconTile icon={m.role === "you" ? "user" : "sparkles"} tone={m.role === "you" ? "teal" : "violet"} size="sm" round />
              <div className={cx("max-w-[80%] rounded-card px-4 py-3 text-sm leading-relaxed", m.role === "you" ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-soft text-ink ring-1 ring-line")}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.status ? <StatusBadge status={m.status} className="mt-2" /> : null}
              </div>
            </div>
          ))}
          {send.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="text-violet-500" />
              Assistant is working…
            </p>
          ) : null}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-line bg-white p-4">
          <Input wrapperClassName="flex-1" aria-label="Message" placeholder="Describe a task…" value={message} onChange={(e) => setMessage(e.target.value)} disabled={send.isPending} />
          <Button type="submit" icon="arrowRight" loading={send.isPending} disabled={!message.trim()}>
            Send
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <ErrorNote error={send.error ?? loadRun.error} />
        <Card className="bg-white">
          <CardHeader icon="wrench" tone="slate" title="Tool-call trace" description={activeRunId ? "Tools for the selected run" : "What the assistant executed for the latest request"} />
          {tools.length === 0 ? (
            <p className="text-sm text-muted">No tools executed yet.</p>
          ) : (
            <ol className="space-y-3">
              {tools.map((t, i) => {
                const ok = t.output_result?.success !== false;
                const citations = (t.output_result?.citations ?? t.output_result?.data?.chunks?.map((c) => c.citation).filter(Boolean) ?? []) as unknown[];
                return (
                  <li key={i} className="rounded-ui bg-soft px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-muted ring-1 ring-line">{i + 1}</span>
                        <span className="truncate font-medium text-ink">{t.tool_name ?? t.name ?? "tool"}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {t.latency_ms != null ? <span className="text-xs text-subtle">{t.latency_ms}ms</span> : null}
                        <StatusBadge status={ok ? "success" : "failed"} />
                      </span>
                    </div>
                    {citations.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-line/80 pt-2">
                        {citations.slice(0, 3).map((c, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-muted">
                            <Icon name="file" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                            <span className="min-w-0 break-words">{typeof c === "string" ? c : JSON.stringify(c)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card className="bg-white">
          <CardHeader icon="clock" tone="emerald" title="Run history" description="Previous assistant runs on this project" />
          {runs.isLoading ? (
            <LoadingInline />
          ) : (runs.data ?? []).length === 0 ? (
            <EmptyState icon="sparkles" tone="violet" title="No runs yet" description="Send a message to start the first agent run." />
          ) : (
            <ul className="-mx-1 max-h-80 space-y-1 overflow-y-auto">
              {(runs.data ?? []).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => loadRun.mutate(r)}
                    className={cx(
                      "focus-ring flex w-full items-start gap-3 rounded-ui px-2 py-2.5 text-left transition-colors hover:bg-soft",
                      activeRunId === r.id && "bg-accent-soft",
                    )}
                  >
                    <IconTile icon="sparkles" tone={r.status === "escalated" ? "amber" : "violet"} size="sm" round />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{r.user_message}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-subtle">{timeAgo(r.started_at)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function LoadingInline() {
  return (
    <p className="flex items-center gap-2 py-4 text-sm text-muted">
      <Spinner /> Loading runs…
    </p>
  );
}
