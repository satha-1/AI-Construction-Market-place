import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function AgentChat() {
  const { projectId = "" } = useParams();
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<{ role: string; text: string }[]>([]);
  const [trace, setTrace] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage("");
    setBusy(true);
    setLog((prev) => [...prev, { role: "you", text }]);
    try {
      const run = await api.agentMessage(projectId, text);
      setLog((prev) => [...prev, { role: "agent", text: `${run.final_response} [${run.status}]` }]);
      const tools = await api.agentTools(run.id);
      setTrace(JSON.stringify(tools, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500"><Link to={`/projects/${projectId}`}>Back to project</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">Agent</h1>
      <p className="text-sm text-slate-600">Try: “analyze documents and generate BOQ with costs” or “search vendors”.</p>
      <div className="mt-4 min-h-64 space-y-3 rounded-xl border bg-white p-4">
        {log.map((entry, idx) => (
          <p key={idx}><span className="font-semibold">{entry.role}:</span> {entry.text}</p>
        ))}
        {log.length === 0 ? <p className="text-slate-500">Send a construction task. Tool-call trace appears below.</p> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <form className="mt-4 flex gap-3" onSubmit={onSubmit}>
        <input className="flex-1 rounded border px-3 py-2" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" disabled={busy} />
        <button className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? "Running…" : "Send"}</button>
      </form>
      {trace ? (
        <div className="mt-6">
          <h2 className="font-semibold">Tool-call trace</h2>
          <pre className="mt-2 max-h-96 overflow-auto rounded border bg-white p-3 text-xs">{trace}</pre>
        </div>
      ) : null}
    </div>
  );
}
