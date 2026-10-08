import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { ButtonLink } from "../components/ui";
import { useTheme } from "../lib/theme";
import { homeFor } from "../roles";

export function Brand({ to = "/marketplace" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-ui bg-accent text-sm font-black text-accent-fg">C</span>
      <span className="text-lg font-black tracking-tight text-ink">Conapp</span>
    </Link>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [location, setLocation] = useState(params.get("location") ?? "");
  const { data: locations = [] } = useQuery({ queryKey: ["market", "locations"], queryFn: api.marketLocations, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (pathname === "/marketplace") {
      setQ(params.get("q") ?? "");
      setLocation(params.get("location") ?? "");
    }
  }, [pathname, params]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (location) next.set("location", location);
    navigate(`/marketplace${next.toString() ? `?${next}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex min-h-[48px] w-full items-stretch overflow-hidden rounded-ui border border-line bg-surface transition-colors duration-ui ease-ui focus-within:border-accent hover:border-subtle">
      <label className="relative hidden w-[180px] shrink-0 items-center sm:flex">
        <Icon name="pin" className="pointer-events-none absolute left-3 h-4 w-4 text-accent" />
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          className="h-full w-full appearance-none bg-transparent pl-9 pr-3 text-sm text-ink focus:outline-none"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <span className="my-2 hidden w-px bg-line sm:block" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cement, steel, vendors…"
        aria-label="Search materials"
        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink placeholder:text-subtle focus:outline-none"
      />
      <button type="submit" aria-label="Search" className="flex w-12 items-center justify-center bg-accent text-accent-fg transition-opacity hover:opacity-90">
        <Icon name="search" className="h-5 w-5" />
      </button>
    </form>
  );
}

export default function StorefrontLayout() {
  useTheme("storefront");
  const { user } = useAuth();
  return (
    <div className="theme-root flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:h-16 lg:h-[72px] lg:gap-6 lg:px-8">
          <Brand />
          <div className="hidden flex-1 md:block lg:mx-6">
            <SearchBar />
          </div>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Main">
            <Link to="/marketplace/vendors" className="hidden min-h-[44px] items-center rounded-ui px-3 text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-flex">
              Vendors
            </Link>
            {user ? (
              <ButtonLink to={homeFor(user.role)} size="md">
                Workspace
              </ButtonLink>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-[44px] items-center rounded-ui px-3 text-sm font-medium text-ink transition-colors hover:text-accent">
                  Log in
                </Link>
                <ButtonLink to="/register" size="md">
                  Sign up
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
        <div className="border-t border-line px-4 pb-3 pt-3 md:hidden">
          <SearchBar />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-soft">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              AI-assisted construction estimation with a verified vendor marketplace. Estimate, source and compare in one place.
            </p>
          </div>
          <FooterColumn
            title="Marketplace"
            links={[
              { to: "/marketplace", label: "Browse materials" },
              { to: "/marketplace/vendors", label: "Vendor directory" },
            ]}
          />
          <FooterColumn
            title="Workspace"
            links={[
              { to: "/register", label: "Create an account" },
              { to: "/login", label: "Log in" },
            ]}
          />
          <FooterColumn
            title="For vendors"
            links={[
              { to: "/register", label: "Become a vendor" },
              { to: "/login", label: "Vendor portal" },
            ]}
          />
        </div>
        <div className="border-t border-line px-4 py-5 text-center text-xs text-muted">© {new Date().getFullYear()} Conapp. All rights reserved.</div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-muted transition-colors hover:text-accent">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
