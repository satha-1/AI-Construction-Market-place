import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { MarketCategory, MarketItem, MarketVendor } from "../../api";
import { useAuth } from "../../auth";
import { Icon } from "../../components/Icon";
import { buttonClass } from "../../components/ui";
import { quoteAuthPath } from "../../lib/authPaths";
import { cx, money, qty } from "../../lib/format";
import { categoryVisual, toneClasses, toneFor } from "../../lib/visuals";

/** 16:9 visual block: soft category colour + large icon, gradient overlay & 1.05 scale on hover. */
export function Media({ category, seed, children }: { category: string | null; seed: string; children?: ReactNode }) {
  const v = categoryVisual(category ?? seed);
  const t = toneClasses[v.tone];
  return (
    <div className={cx("relative aspect-video overflow-hidden", t.soft)}>
      <div className="flex h-full w-full items-center justify-center transition-transform duration-ui ease-ui group-hover:scale-105">
        <span className={cx("flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-card", t.text)}>
          <Icon name={v.icon} className="h-9 w-9" strokeWidth={1.5} />
        </span>
      </div>
      <div className="absolute inset-0 opacity-0 transition-opacity duration-ui ease-ui group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(26,188,156,0.08), transparent)" }} />
      {children}
    </div>
  );
}

export function ItemCard({ item }: { item: MarketItem }) {
  const { user } = useAuth();
  // Guests must register/sign in before ordering; customers jump to projects.
  const quoteLink = user?.role === "customer" || user?.role === "admin" ? "/projects" : user?.role === "vendor" ? "/vendor" : quoteAuthPath;
  return (
    <article className="group card-hover flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <Media category={item.category} seed={item.item_name}>
        {item.category ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink shadow-card">{item.category}</span> : null}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-card">
          <Icon name="shieldCheck" className="h-3.5 w-3.5" /> Verified
        </span>
      </Media>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{item.item_name}</h3>
        <Link to={`/marketplace/vendors/${item.vendor_id}`} className="mt-2 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent">
          <Icon name="store" className="h-4 w-4" />
          <span className="truncate">{item.company_name}</span>
        </Link>
        {item.vendor_location ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-subtle">
            <Icon name="pin" className="h-4 w-4" /> {item.vendor_location}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xl font-black text-ink">{item.unit_price !== null ? money(item.unit_price) : "On request"}</p>
            <p className="text-xs text-muted">
              {item.unit ? `per ${item.unit}` : "unit price"}
              {item.available_quantity !== null ? ` · ${qty(item.available_quantity)} in stock` : ""}
            </p>
          </div>
          <Link to={quoteLink} className={buttonClass("soft", "sm")}>
            {user?.role === "customer" || user?.role === "admin" ? "Get quote" : user ? "Open workspace" : "Sign in to quote"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CategoryTile({ category, active, onClick }: { category: MarketCategory; active?: boolean; onClick: () => void }) {
  const v = categoryVisual(category.category);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "focus-ring flex min-h-[72px] items-center gap-3 rounded-card border bg-surface px-4 py-3 text-left shadow-card transition-all duration-ui ease-ui hover:-translate-y-0.5 hover:shadow-lift",
        active ? "border-accent ring-4 ring-accent/10" : "border-line hover:border-accent/40",
      )}
    >
      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneClasses[v.tone].tile)}>
        <Icon name={v.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{category.category}</span>
        <span className="text-xs text-muted">{category.count} items</span>
      </span>
    </button>
  );
}

export function VendorBubble({ vendor }: { vendor: MarketVendor }) {
  const v = categoryVisual(vendor.category ?? vendor.company_name);
  return (
    <Link to={`/marketplace/vendors/${vendor.id}`} className="focus-ring group flex w-24 shrink-0 flex-col items-center gap-2 rounded-card p-1 text-center">
      <span className={cx("flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-transparent transition-all duration-ui group-hover:-translate-y-0.5 group-hover:ring-accent/15", toneClasses[v.tone].tile)}>
        <Icon name={v.icon} className="h-7 w-7" strokeWidth={1.6} />
      </span>
      <span className="line-clamp-2 text-xs font-medium text-ink">{vendor.company_name}</span>
    </Link>
  );
}

export function VendorCard({ vendor }: { vendor: MarketVendor }) {
  const tone = toneFor(vendor.company_name);
  const v = categoryVisual(vendor.category ?? vendor.company_name);
  return (
    <Link to={`/marketplace/vendors/${vendor.id}`} className="focus-ring group card-hover flex flex-col rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-4">
        <span className={cx("flex h-14 w-14 shrink-0 items-center justify-center rounded-full", toneClasses[vendor.category ? v.tone : tone].tile)}>
          <Icon name={v.icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
            <span className="truncate">{vendor.company_name}</span>
            <Icon name="shieldCheck" className="h-4 w-4 shrink-0 text-emerald-500" />
          </h3>
          <p className="text-sm text-muted">{vendor.category ?? "General supplier"}</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-muted">{vendor.description || "Construction materials supplier on Conapp."}</p>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <Icon name="pin" className="h-4 w-4" /> {vendor.location ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-accent">
          {vendor.published_items} items <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
