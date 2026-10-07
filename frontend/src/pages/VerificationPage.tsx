import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Flag } from "../api";

export default function VerificationPage() {
  const { projectId = "" } = useParams();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setFlags(await api.verification(projectId));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [projectId]);

  async function act(flag: Flag, action: "approve" | "reject" | "correct") {
    try {
      if (action === "correct") {
        const raw = window.prompt("Corrected quantity (number)", "1");
        if (raw == null) return;
        await api.verifyAction(flag.id, "correct", { new_value: { quantity: Number(raw) }, comment: "UI correction" });
      } else {
        await api.verifyAction(flag.id, action);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500"><Link to={`/projects/${projectId}`}>Back to project</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">Human verification</h1>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {flags.map((flag) => (
          <li key={flag.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">{flag.entity_type} · {flag.reason}</p>
            <p className="text-sm text-slate-600">Confidence: {flag.confidence_score ?? "n/a"} · {flag.entity_id}</p>
            <div className="mt-3 flex gap-2 text-sm">
              <button className="rounded bg-emerald-700 px-3 py-1 text-white" onClick={() => act(flag, "approve")}>Approve</button>
              <button className="rounded border px-3 py-1" onClick={() => act(flag, "correct")}>Correct</button>
              <button className="rounded border border-red-300 px-3 py-1 text-red-700" onClick={() => act(flag, "reject")}>Reject</button>
            </div>
          </li>
        ))}
        {flags.length === 0 ? <li className="text-sm text-slate-500">No open flags.</li> : null}
      </ul>
    </div>
  );
}
