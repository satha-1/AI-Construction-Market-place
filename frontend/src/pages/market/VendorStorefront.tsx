import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Icon } from "../../components/Icon";
import { ButtonLink, EmptyState, ErrorNote, LoadingBlock } from "../../components/ui";
import { cx } from "../../lib/format";
import { categoryVisual, toneClasses } from "../../lib/visuals";
import { ItemCard } from "./MarketCards";

export default function VendorStorefront() {
  const { vendorId = "" } = useParams();
  const { user } = useAuth();
  const { data: vendor, isLoading, error } = useQuery({ queryKey: ["market", "vendor", vendorId], queryFn: () => api.marketVendor(vendorId) });

  if (isLoading) return <LoadingBlock />;
  if (error || !vendor)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorNote error={error ?? new Error("Vendor not found")} />
      </div>
    );

  const v = categoryVisual(vendor.category ?? vendor.company_name);
  const contacts = [
    vendor.location ? { icon: "pin" as const, text: vendor.location } : null,
    vendor.contact_email ? { icon: "mail" as const, text: vendor.contact_email, href: `mailto:${vendor.contact_email}` } : null,
    vendor.phone ? { icon: "phone" as const, text: vendor.phone, href: `tel:${vendor.phone}` } : null,
    vendor.website ? { icon: "globe" as const, text: vendor.website.replace(/^https?:\/\//, ""), href: vendor.website } : null,
  ].filter(Boolean) as { icon: "pin" | "mail" | "phone" | "globe"; text: string; href?: string }[];

  return (
    <>
      <section className="border-b border-line bg-gradient-to-br from-accent-soft via-surface to-sky-50">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <Link to="/marketplace/vendors" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent">
            <Icon name="arrowLeft" className="h-4 w-4" /> All vendors
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <span className={cx("flex h-20 w-20 shrink-0 items-center justify-center rounded-full shadow-card", toneClasses[v.tone].tile)}>
                <Icon name={v.icon} className="h-9 w-9" strokeWidth={1.5} />
              </span>
              <div>
                <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink">
                  {vendor.company_name}
                  <Icon name="shieldCheck" className="h-6 w-6 text-emerald-500" />
                </h1>
                <p className="mt-1 text-base text-muted">{vendor.category ?? "General supplier"}</p>
              </div>
            </div>
            {!user ? (
              <ButtonLink to="/register" size="lg" icon="file">
                Sign up to request a quote
              </ButtonLink>
            ) : null}
          </div>
          {vendor.description ? <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">{vendor.description}</p> : null}
          {contacts.length ? (
            <ul className="mt-6 flex flex-wrap gap-3">
              {contacts.map((c) => (
                <li key={c.icon}>
                  {c.href ? (
                    <a href={c.href} target={c.icon === "globe" ? "_blank" : undefined} rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink shadow-card transition-colors hover:border-accent hover:text-accent">
                      <Icon name={c.icon} className="h-4 w-4 text-accent" /> {c.text}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink shadow-card">
                      <Icon name={c.icon} className="h-4 w-4 text-accent" /> {c.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-ink">
          Catalog <span className="text-muted">({vendor.items.length})</span>
        </h2>
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
