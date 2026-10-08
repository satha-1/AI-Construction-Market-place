import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api";
import { EmptyState, ErrorNote, LoadingBlock, PageHeader, SearchInput } from "../../components/ui";
import { VendorCard } from "./MarketCards";

export default function VendorDirectory() {
  const [q, setQ] = useState("");
  const { data = [], isLoading, error } = useQuery({ queryKey: ["market", "vendors", q], queryFn: () => api.marketVendors({ q }), placeholderData: (prev) => prev });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <PageHeader icon="store" tone="blue" title="Vendor directory" description="Approved suppliers publishing catalogs on Conapp." actions={<SearchInput className="w-full sm:w-80" value={q} onChange={setQ} placeholder="Search vendors" />} />
      <ErrorNote error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon="store" tone="blue" title="No vendors found" description="Try another name or check back soon." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </div>
  );
}
