import { FormEvent, useEffect, useState } from "react";
import { api, Vendor } from "../api";

export default function Marketplace() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [catalog, setCatalog] = useState<unknown[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load(query?: string) {
    const [v, c] = await Promise.all([api.vendors(), api.marketplaceCatalog(query)]);
    setVendors(v);
    setCatalog(c);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    try {
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Marketplace</h1>
      <form className="mt-4 flex gap-2" onSubmit={onSearch}>
        <input className="rounded border px-3 py-2" placeholder="Search catalog" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Search</button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <h2 className="mt-8 font-semibold">Published catalog</h2>
      <pre className="mt-2 overflow-auto rounded-xl border bg-white p-4 text-sm">{JSON.stringify(catalog, null, 2)}</pre>
      <h2 className="mt-8 font-semibold">Vendors</h2>
      <ul className="mt-2 space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="rounded border bg-white px-4 py-3 text-sm">
            {v.company_name} · {v.category || "uncategorized"} · {v.location || "n/a"}
          </li>
        ))}
      </ul>
    </div>
  );
}
