import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api";
import { EmptyState, ErrorNote, LoadingBlock, SearchInput } from "../../components/ui";
import { VendorCard } from "./MarketCards";

export default function VendorDirectory() {
  const [q, setQ] = useState("");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["market", "vendors", q], queryFn: () => api.marketVendors({ q }), placeholderData: (prev) => prev });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-ink">Vendor directory</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Approved suppliers publishing catalogs on Conapp.</p>
      <SearchInput className="my-8 max-w-md" value={q} onChange={setQ} placeholder="Search vendors" />
      <ErrorNote error={error} />
      {isLoading ? <LoadingBlock /> : data.length === 0 ? <EmptyState title="No vendors found" /> : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </div>
  );
}
