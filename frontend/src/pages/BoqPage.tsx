import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, BoqItem } from "../api";

function confidenceClass(score: string | number | null) {
  const n = Number(score ?? 0);
  if (n >= 0.7) return "bg-emerald-100 text-emerald-800";
  if (n >= 0.5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function BoqPage() {
  const { projectId = "" } = useParams();
  const [items, setItems] = useState<BoqItem[]>([]);
  const [estimate, setEstimate] = useState<string>("—");
  const [matches, setMatches] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [boq, est] = await Promise.all([api.boq(projectId), api.estimate(projectId)]);
    setItems(boq.items);
    setEstimate(est.estimate ? `${est.estimate.total_cost} ${est.estimate.currency}` : "No estimate yet");
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [projectId]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await api.generateBoq(projectId);
      await api.calculateEstimate(projectId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function searchVendors() {
    try {
      const res = await api.vendorSearch(projectId);
      setMatches(JSON.stringify(res.matches, null, 2));
    } catch (err) {
      setMatches(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500"><Link to={`/projects/${projectId}`}>Back to project</Link></p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BOQ & estimate</h1>
          <p className="text-sm text-slate-600">AI estimate total: {estimate}</p>
        </div>
        <div className="flex gap-2">
          <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50" onClick={generate}>
            {busy ? "Working…" : "Generate BOQ + estimate"}
          </button>
          <button className="rounded border px-4 py-2" onClick={searchVendors}>Match vendors</button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 overflow-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{item.item_name}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.quantity ?? "—"}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs ${confidenceClass(item.confidence_score)}`}>
                    {item.confidence_score ?? "n/a"}
                    {item.is_verified ? " · verified" : ""}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No BOQ yet. Upload docs, then generate.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {matches ? (
        <div className="mt-6">
          <h2 className="font-semibold">Vendor matches</h2>
          <pre className="mt-2 overflow-auto rounded border bg-white p-3 text-xs">{matches}</pre>
        </div>
      ) : null}
    </div>
  );
}
