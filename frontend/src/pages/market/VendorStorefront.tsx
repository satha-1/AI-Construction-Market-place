import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { ButtonLink, EmptyState, ErrorNote, GeoPattern, LoadingBlock } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { ItemCard } from "./MarketCards";

export default function VendorStorefront() {
  const { vendorId = "" } = useParams();
  const { user } = useAuth();
  const { data: vendor, isLoading, error } = useQuery({ queryKey: ["market", "vendor", vendorId], queryFn: () => api.marketVendor(vendorId) });

  if (isLoading) return <LoadingBlock />;
  if (error || !vendor) return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorNote error={error ?? new Error("Vendor not found")} /></div>;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-soft">
        <GeoPattern variant="circles" className="absolute inset-0 h-full w-full text-subtle opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <Link to="/marketplace/vendors" className="text-xs font-bold uppercase tracking-widest text-muted hover:text-accent">
            ← All vendors
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ink">{vendor.company_name}</h1>
          <p className="mt-2 text-base text-muted">{vendor.category ?? "General supplier"}</p>
          {vendor.description ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{vendor.description}</p> : null}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
            {vendor.location ? <li className="flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4 text-accent" /> {vendor.location}</li> : null}
            {vendor.contact_email ? <li><a className="hover:text-accent" href={`mailto:${vendor.contact_email}`}>{vendor.contact_email}</a></li> : null}
            {vendor.phone ? <li>{vendor.phone}</li> : null}
            {vendor.website ? <li><a className="hover:text-accent" href={vendor.website} target="_blank" rel="noreferrer noopener">{vendor.website}</a></li> : null}
          </ul>
          {!user ? <div className="mt-6"><ButtonLink to="/register" size="lg">Sign up to request a quote</ButtonLink></div> : null}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <h2 className="mb-6 text-xl font-black text-ink">Catalog ({vendor.items.length})</h2>
        {vendor.items.length === 0 ? (
          <EmptyState title="No published items" description="This vendor hasn't published any catalog items yet." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendor.items.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
