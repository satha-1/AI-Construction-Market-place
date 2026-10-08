import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { Button, EmptyState, ErrorNote, GeoPattern, Input, LoadingBlock, Select } from "../../components/ui";
import { cx } from "../../lib/format";
import { ItemCard } from "./MarketCards";

const PAGE = 12;

export default function MarketplaceHome() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const location = params.get("location") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => setLimit(PAGE), [q, location, category, sort, min, max]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const categories = useQuery({ queryKey: ["market", "categories"], queryFn: api.marketCategories, staleTime: 60_000 });
  const catalog = useQuery({
    queryKey: ["market", "catalog", q, location, category, sort, min, max, limit],
    queryFn: () => api.marketCatalog({ q, location, category, sort, min_price: min ? Number(min) : undefined, max_price: max ? Number(max) : undefined, limit }),
    placeholderData: (prev) => prev,
  });
  const filtered = !!(q || location || category || min || max);

  return (
    <>
      {!filtered ? (
        <section className="relative overflow-hidden border-b border-line bg-soft">
          <GeoPattern variant="grid" className="absolute inset-0 h-full w-full text-subtle opacity-50" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Construction marketplace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl">Materials and suppliers, verified and ready to quote.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">Browse published catalogs from approved vendors. Sign up to turn your BOQ into RFQs and compare quotations side by side.</p>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <section aria-labelledby="cat-h" className="mb-10">
          <h2 id="cat-h" className="mb-4 text-xl font-black text-ink">
            Browse by category
          </h2>
          {categories.isLoading ? (
            <LoadingBlock />
          ) : (categories.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No categories yet — vendors are still publishing their catalogs.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {categories.data!.map((c) => {
                const active = category.toLowerCase() === c.category.toLowerCase();
                return (
                  <button
                    key={c.category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ category: active ? "" : c.category })}
                    className={cx(
                      "focus-ring min-h-[72px] rounded-card border px-4 py-3 text-left transition-all duration-ui ease-ui hover:-translate-y-0.5 hover:shadow-lift",
                      active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50",
                    )}
                  >
                    <span className="block truncate text-sm font-bold text-ink">{c.category}</span>
                    <span className="text-xs text-muted">{c.count} items</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink">{filtered ? "Search results" : "Latest materials"}</h2>
            <p className="mt-1 text-sm text-muted">
              {catalog.data ? `${catalog.data.total} item${catalog.data.total === 1 ? "" : "s"}` : "Loading…"}
              {q ? ` for “${q}”` : ""}
              {location ? ` in ${location}` : ""}
              {category ? ` · ${category}` : ""}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-[110px_110px_180px]">
            <Input aria-label="Minimum price" type="number" min="0" placeholder="Min $" value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => update({ min })} />
            <Input aria-label="Maximum price" type="number" min="0" placeholder="Max $" value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => update({ max })} />
            <Select aria-label="Sort" wrapperClassName="col-span-2 sm:col-span-1" value={sort} onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </Select>
          </div>
        </div>

        <ErrorNote error={catalog.error} />
        {catalog.isLoading ? (
          <LoadingBlock />
        ) : (catalog.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="No materials found"
            description="Try a different keyword, widen the location, or clear your filters."
            action={
              filtered ? (
                <Button onClick={() => { setMin(""); setMax(""); setParams({}, { replace: true }); }}>Clear filters</Button>
              ) : (
                <Link to="/register" className="text-sm font-bold text-accent hover:underline">Become a vendor</Link>
              )
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.data!.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {catalog.data!.items.length < catalog.data!.total ? (
              <div className="mt-10 flex justify-center">
                <Button variant="secondary" size="lg" loading={catalog.isFetching} onClick={() => setLimit((l) => l + PAGE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
