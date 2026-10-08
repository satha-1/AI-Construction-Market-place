import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api";
import { Badge, Button, Card, CardHeader, ErrorNote, Input } from "../../components/ui";
import { cx } from "../../lib/format";
import { useProjectId } from "./ProjectWorkspace";

type Message = { role: "you" | "assistant"; text: string; status?: string };
type Tool = { tool_name?: string; name?: string; status?: string };

const suggestions = ["Analyze documents and generate BOQ with costs", "Search vendors for my BOQ items", "What items need verification?"];

export default function AgentTab() {
  const projectId = useProjectId();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<Message[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const run = await api.agentMessage(projectId, text);
      const trace = await api.agentTools(run.id).catch(() => []);
      return { run, trace };
    },
    onSuccess: ({ run, trace }) => {
      setLog((prev) => [...prev, { role: "assistant", text: run.final_response, status: run.status }]);
      setTools(trace);
      ["boq", "estimate", "flags", "project", "documents"].forEach((k) => qc.invalidateQueries({ queryKey: [k, projectId] }));
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
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card padded={false} className="flex min-h-[28rem] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {log.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-bold text-ink">Ask the construction assistant</p>
              <p className="mt-1 text-xs text-muted">It reads your documents, builds a BOQ, calculates costs and finds vendors. It flags anything uncertain.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={(e) => submit(e, s)} className="rounded-ui border border-line px-3 py-2 text-[11px] text-muted transition-colors hover:border-ink hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {log.map((m, i) => (
            <div key={i} className={cx("flex", m.role === "you" && "justify-end")}>
              <div className={cx("max-w-[85%] rounded-card border px-4 py-3 text-xs leading-relaxed", m.role === "you" ? "border-accent bg-accent text-accent-fg" : "border-line bg-soft text-ink")}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.status ? <Badge className="mt-2">{m.status}</Badge> : null}
              </div>
            </div>
          ))}
          {send.isPending ? <p className="text-xs text-muted">Assistant is working…</p> : null}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-line p-4">
          <Input wrapperClassName="flex-1" aria-label="Message" placeholder="Describe a task…" value={message} onChange={(e) => setMessage(e.target.value)} disabled={send.isPending} />
          <Button type="submit" loading={send.isPending} disabled={!message.trim()}>
            Send
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <ErrorNote error={send.error} />
        <Card>
          <CardHeader title="Tool-call trace" description="What the assistant executed for the latest request." />
          {tools.length === 0 ? (
            <p className="text-xs text-muted">No tools executed yet.</p>
          ) : (
            <ol className="space-y-2">
              {tools.map((t, i) => (
                <li key={i} className="flex items-center justify-between rounded-ui border border-line px-3 py-2 text-xs">
                  <span className="font-bold">{t.tool_name ?? t.name ?? "tool"}</span>
                  {t.status ? <Badge tone={t.status === "success" ? "success" : "neutral"}>{t.status}</Badge> : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
