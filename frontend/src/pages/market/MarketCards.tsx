import { Link } from "react-router-dom";
import type { MarketItem, MarketVendor } from "../../api";
import { Badge, GeoPattern, type PatternVariant } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { money, qty } from "../../lib/format";

const patterns: PatternVariant[] = ["blocks", "grid", "circles", "diagonal", "arcs"];
export const patternFor = (seed: string): PatternVariant => patterns[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % patterns.length];

/** 16:9 media with hover gradient overlay + 1.05 scale, per the storefront spec. */
export function Media({ seed, children }: { seed: string; children?: React.ReactNode }) {
  return (
    <div className="relative aspect-video overflow-hidden border-b border-line bg-soft">
      <GeoPattern variant={patternFor(seed)} className="h-full w-full text-subtle transition-transform duration-ui ease-ui group-hover:scale-105" />
      <div className="absolute inset-0 opacity-0 transition-opacity duration-ui ease-ui group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(26,188,156,0.08), transparent)" }} />
      {children}
    </div>
  );
}

export function ItemCard({ item }: { item: MarketItem }) {
  return (
    <article className="group card-hover overflow-hidden rounded-card border border-line bg-surface">
      <Media seed={item.item_name}>{item.category ? <Badge className="absolute left-3 top-3 bg-surface" tone="accent">{item.category}</Badge> : null}</Media>
      <div className="p-5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-ink">{item.item_name}</h3>
        <Link to={`/marketplace/vendors/${item.vendor_id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
          {item.company_name}
        </Link>
        {item.vendor_location ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-subtle">
            <Icon name="pin" className="h-3.5 w-3.5" /> {item.vendor_location}
          </p>
        ) : null}
        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-xl font-black text-ink">{item.unit_price !== null ? money(item.unit_price) : "On request"}</p>
            {item.unit ? <p className="text-xs text-muted">per {item.unit}</p> : null}
          </div>
          {item.available_quantity !== null ? <p className="text-xs text-muted">{qty(item.available_quantity)} in stock</p> : null}
        </div>
      </div>
    </article>
  );
}

export function VendorCard({ vendor }: { vendor: MarketVendor }) {
  return (
    <Link to={`/marketplace/vendors/${vendor.id}`} className="focus-ring group card-hover block overflow-hidden rounded-card border border-line bg-surface">
      <Media seed={vendor.company_name} />
      <div className="p-5">
        <h3 className="truncate text-base font-bold text-ink">{vendor.company_name}</h3>
        <p className="mt-1 text-sm text-muted">{vendor.category ?? "General supplier"}</p>
        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted">{vendor.description ?? ""}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Icon name="pin" className="h-3.5 w-3.5" /> {vendor.location ?? "—"}
          </span>
          <span className="font-bold text-accent">{vendor.published_items} items</span>
        </div>
      </div>
    </Link>
  );
}
