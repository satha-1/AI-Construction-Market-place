import { FormEvent, useEffect, useState } from "react";
import { api, Vendor } from "../api";

type CatalogItem = {
  id: string;
  item_name: string;
  category: string | null;
  unit_price: string | number | null;
  is_published: boolean;
};

export default function VendorPortal() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [rfqs, setRfqs] = useState("[]");
  const [message, setMessage] = useState("");

  async function refreshVendor(v: Vendor) {
    setVendor(v);
    setCatalog((await api.vendorCatalog(v.id)) as CatalogItem[]);
    setRfqs(JSON.stringify(await api.vendorRfqs(v.id), null, 2));
  }

  useEffect(() => {
    api.myVendor().then(refreshVendor).catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await api.createVendor({ company_name: company, category, location });
      setMessage("Vendor profile created.");
      await refreshVendor(created);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create profile");
    }
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor) return;
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await api.uploadVendorDocument(vendor.id, file);
      input.value = "";
      setMessage("Catalog document uploaded and processed.");
      await refreshVendor(vendor);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function publish(id: string) {
    await api.publishCatalogItem(id);
    if (vendor) await refreshVendor(vendor);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Vendor portal</h1>
      {!vendor ? (
        <form className="mt-6 max-w-md space-y-3" onSubmit={onSubmit}>
          <input className="w-full rounded border px-3 py-2" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button className="rounded bg-slate-900 px-4 py-2 text-white">Save profile</button>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-slate-600">{vendor.company_name} · {vendor.category} · {vendor.location}</p>
          <form className="mt-4 flex gap-3" onSubmit={onUpload}>
            <input name="file" type="file" accept=".csv,.xlsx,.pdf" />
            <button className="rounded bg-slate-900 px-4 py-2 text-white">Upload catalog</button>
          </form>
          <h2 className="mt-8 font-semibold">Catalog items</h2>
          <ul className="mt-2 space-y-2">
            {catalog.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded border bg-white px-4 py-3 text-sm">
                <span>{item.item_name} · {item.category} · {item.unit_price ?? "n/a"} {item.is_published ? "· published" : ""}</span>
                {!item.is_published ? (
                  <button className="text-amber-800" onClick={() => publish(item.id)}>Publish</button>
                ) : null}
              </li>
            ))}
            {catalog.length === 0 ? <li className="text-sm text-slate-500">Upload a CSV/Excel catalog to extract items.</li> : null}
          </ul>
          <h2 className="mt-8 font-semibold">RFQ inbox</h2>
          <pre className="mt-2 overflow-auto rounded border bg-white p-3 text-xs">{rfqs}</pre>
        </div>
      )}
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}
