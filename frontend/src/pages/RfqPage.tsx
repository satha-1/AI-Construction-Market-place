import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, BoqItem, Vendor } from "../api";

type RfqRow = { id: string; status: string; boq_id: string; created_at: string };

export default function RfqPage() {
  const { projectId = "" } = useParams();
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<BoqItem[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [comparison, setComparison] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [r, v, b] = await Promise.all([api.rfqs(projectId), api.vendors(), api.boq(projectId)]);
    setRfqs(r as RfqRow[]);
    setVendors(v);
    setItems(b.items);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [projectId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createRfq(projectId, {
        vendor_ids: selectedVendors,
        boq_item_ids: items.map((i) => i.id),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  function toggleVendor(id: string) {
    setSelectedVendors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div>
      <p className="text-sm text-slate-500"><Link to={`/projects/${projectId}`}>Back to project</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">RFQs</h1>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <form className="mt-6 rounded-xl border bg-white p-4" onSubmit={onCreate}>
        <p className="font-medium">Create RFQ from current BOQ</p>
        <p className="text-sm text-slate-600">{items.length} BOQ items will be included.</p>
        <div className="mt-3 space-y-2">
          {vendors.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedVendors.includes(v.id)} onChange={() => toggleVendor(v.id)} />
              {v.company_name}
            </label>
          ))}
          {vendors.length === 0 ? <p className="text-sm text-slate-500">No vendors yet — register a vendor account first.</p> : null}
        </div>
        <button className="mt-4 rounded bg-slate-900 px-4 py-2 text-white" disabled={!selectedVendors.length || !items.length}>
          Create RFQ
        </button>
      </form>
      <ul className="mt-6 space-y-3">
        {rfqs.map((rfq) => (
          <li key={rfq.id} className="flex items-center justify-between rounded border bg-white px-4 py-3 text-sm">
            <span>{rfq.id} · {rfq.status}</span>
            <button
              className="text-amber-800"
              onClick={async () => {
                try {
                  setComparison(JSON.stringify(await api.compareRfq(rfq.id), null, 2));
                } catch (err) {
                  setComparison(err instanceof Error ? err.message : "Failed");
                }
              }}
            >
              Compare quotes
            </button>
          </li>
        ))}
      </ul>
      {comparison ? <pre className="mt-4 overflow-auto rounded border bg-white p-3 text-xs">{comparison}</pre> : null}
    </div>
  );
}
