import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { Icon, type IconName } from "../../components/Icon";
import { Button, ButtonLink, EmptyState, ErrorNote, Input, LoadingBlock } from "../../components/ui";
import { cx } from "../../lib/format";
import { CategoryTile, ItemCard, VendorBubble } from "./MarketCards";

const PAGE = 12;

const sorts = [
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "name", label: "A–Z" },
];

const trust: { icon: IconName; label: string }[] = [
  { icon: "shieldCheck", label: "Verified vendors" },
  { icon: "calculator", label: "AI-assisted estimates" },
  { icon: "truck", label: "Local suppliers" },
];

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      {action}
    </div>
  );
}

function Chip({ active, onClick, children, icon }: { active?: boolean; onClick: () => void; children: React.ReactNode; icon?: IconName }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-ui border px-3.5 text-sm font-medium transition-all duration-ui",
        active ? "border-accent bg-accent-soft text-teal-700" : "border-line bg-surface text-muted hover:border-subtle hover:text-ink",
      )}
    >
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export default function MarketplaceHome() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const location = params.get("location") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";
  const [showFilters, setShowFilters] = useState(false);
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const [limit, setLimit] = useState(PAGE);
  const minParam = params.get("min") ?? "";
  const maxParam = params.get("max") ?? "";

  useEffect(() => setLimit(PAGE), [q, location, category, sort, minParam, maxParam]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const categories = useQuery({ queryKey: ["market", "categories"], queryFn: api.marketCategories, staleTime: 60_000 });
  const vendors = useQuery({ queryKey: ["market", "vendors", ""], queryFn: () => api.marketVendors({}), staleTime: 60_000 });
  const locations = useQuery({ queryKey: ["market", "locations"], queryFn: api.marketLocations, staleTime: 5 * 60_000 });
  const catalog = useQuery({
    queryKey: ["market", "catalog", q, location, category, sort, minParam, maxParam, limit],
    queryFn: () =>
      api.marketCatalog({ q, location, category, sort, min_price: minParam ? Number(minParam) : undefined, max_price: maxParam ? Number(maxParam) : undefined, limit }),
    placeholderData: (prev) => prev,
  });
  const filtered = !!(q || location || category || minParam || maxParam);
  const totalItems = (categories.data ?? []).reduce((n, c) => n + c.count, 0);

  return (
    <>
      {!filtered ? (
        <section className="border-b border-line bg-gradient-to-br from-accent-soft via-surface to-sky-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-accent shadow-card">
                <Icon name="sparkles" className="h-3.5 w-3.5" /> Construction marketplace
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Building materials from <span className="text-accent">verified suppliers</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">Browse published catalogs freely. Sign in when you are ready to request a quotation or sell materials.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink to="/register?role=customer&from=/projects" icon="briefcase">
                  Register to order
                </ButtonLink>
                <ButtonLink to="/login" variant="secondary" icon="user">
                  Sign in
                </ButtonLink>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                {trust.map((t) => (
                  <li key={t.label} className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-accent shadow-card">
                      <Icon name={t.icon} className="h-4 w-4" />
                    </span>
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:w-80">
              {[
                { icon: "store" as const, value: vendors.data?.length ?? "–", label: "Vendors", cls: "text-sky-600 bg-sky-50" },
                { icon: "box" as const, value: totalItems || "–", label: "Products", cls: "text-teal-600 bg-teal-50" },
                { icon: "layers" as const, value: categories.data?.length ?? "–", label: "Categories", cls: "text-violet-600 bg-violet-50" },
                { icon: "pin" as const, value: locations.data?.length ?? "–", label: "Locations", cls: "text-emerald-600 bg-emerald-50" },
              ].map((s) => (
                <div key={s.label} className="rounded-card border border-line bg-surface p-4 shadow-card">
                  <span className={cx("flex h-9 w-9 items-center justify-center rounded-full", s.cls)}>
                    <Icon name={s.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 text-2xl font-black text-ink">{s.value}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 lg:px-8">
        <section aria-label="Categories">
          <SectionTitle title="Browse by category" action={category ? <Button size="sm" variant="ghost" icon="close" onClick={() => update({ category: "" })}>Clear category</Button> : null} />
          {categories.isLoading ? (
            <LoadingBlock />
          ) : (categories.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No categories yet — vendors are still publishing their catalogs.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {categories.data!.map((c) => {
                const active = category.toLowerCase() === c.category.toLowerCase();
                return <CategoryTile key={c.category} category={c} active={active} onClick={() => update({ category: active ? "" : c.category })} />;
              })}
            </div>
          )}
        </section>

        {!filtered && (vendors.data?.length ?? 0) > 0 ? (
          <section aria-label="Trusted vendors">
            <SectionTitle
              title="Trusted vendors"
              action={
                <Link to="/marketplace/vendors" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                  View all <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              }
            />
            <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 sm:gap-6">
              {vendors.data!.slice(0, 10).map((v) => (
                <VendorBubble key={v.id} vendor={v} />
              ))}
            </div>
          </section>
        ) : null}

        <section aria-label="Materials">
          <SectionTitle
            title={filtered ? "Search results" : location ? `Materials in ${location}` : "Latest materials"}
            action={
              <div className="flex flex-wrap gap-2">
                <Chip icon="sliders" active={showFilters || !!(minParam || maxParam)} onClick={() => setShowFilters((s) => !s)}>
                  Filters
                </Chip>
                {sorts.map((s) => (
                  <Chip key={s.id} active={sort === s.id} onClick={() => update({ sort: s.id === "newest" ? "" : s.id })}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            }
          />
          <p className="-mt-3 mb-5 text-sm text-muted">
            {catalog.data ? `${catalog.data.total} item${catalog.data.total === 1 ? "" : "s"}` : "Loading…"}
            {q ? ` for “${q}”` : ""}
            {location ? ` in ${location}` : ""}
            {category ? ` · ${category}` : ""}
          </p>

          {showFilters ? (
            <div className="mb-6 flex flex-wrap items-end gap-3 rounded-card border border-line bg-soft p-4">
              <Input label="Min price" type="number" min="0" placeholder="$0" value={min} onChange={(e) => setMin(e.target.value)} wrapperClassName="w-36" />
              <Input label="Max price" type="number" min="0" placeholder="Any" value={max} onChange={(e) => setMax(e.target.value)} wrapperClassName="w-36" />
              <Button onClick={() => update({ min, max })}>Apply</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMin("");
                  setMax("");
                  update({ min: "", max: "" });
                }}
              >
                Reset
              </Button>
            </div>
          ) : null}

          <ErrorNote error={catalog.error} />
          {catalog.isLoading ? (
            <LoadingBlock />
          ) : (catalog.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon="search"
              title="No materials found"
              description="Try a different keyword, widen the location, or clear your filters."
              action={
                filtered ? (
                  <Button
                    onClick={() => {
                      setMin("");
                      setMax("");
                      setParams({}, { replace: true });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <ButtonLink to="/register?role=vendor&from=/vendor" icon="store">
                    Become a vendor
                  </ButtonLink>
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
        </section>

        {!filtered ? (
          <section className="overflow-hidden rounded-card bg-gradient-to-r from-accent to-secondary p-8 text-white sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Icon name="store" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">Sell on Conapp</h2>
                  <p className="mt-1 max-w-lg text-sm text-white/85">Publish your catalog, get matched to real BOQs and receive RFQs from customers.</p>
                </div>
              </div>
              <Link to="/register?role=vendor&from=/vendor" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-ui bg-white px-6 text-sm font-semibold text-teal-700 transition hover:bg-white/90">
                Sign up to sell <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
