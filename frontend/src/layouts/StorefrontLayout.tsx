import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Icon, type IconName } from "../components/Icon";
import { ButtonLink } from "../components/ui";
import { cx } from "../lib/format";
import { useTheme } from "../lib/theme";
import { homeFor } from "../roles";

export function Brand({ to = "/marketplace" }: { to?: string }) {
  return (
    <Link to={to} className="focus-ring flex items-center gap-2 rounded-ui" aria-label="Conapp home">
      <span className="flex h-8 w-8 items-center justify-center rounded-ui bg-gradient-to-br from-accent to-secondary text-white shadow-sm">
        <Icon name="building" className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="text-xl font-black tracking-tight text-accent">Conapp</span>
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
    <form
      onSubmit={submit}
      role="search"
      className="flex min-h-[48px] w-full items-stretch overflow-hidden rounded-ui border border-line bg-soft/60 transition-all duration-ui ease-ui focus-within:border-accent focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent/10 hover:border-subtle"
    >
      <label className="relative hidden w-[180px] shrink-0 items-center sm:flex">
        <Icon name="pin" className="pointer-events-none absolute left-3.5 h-4 w-4 text-accent" />
        <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location" className="h-full w-full cursor-pointer appearance-none bg-transparent pl-10 pr-3 text-sm text-ink focus:outline-none">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <span className="my-2.5 hidden w-px bg-line sm:block" aria-hidden="true" />
      <div className="relative flex min-w-0 flex-1 items-center">
        <Icon name="search" className="pointer-events-none absolute left-3.5 h-4 w-4 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cement, steel, tiles or vendors" aria-label="Search materials" className="h-full w-full min-w-0 bg-transparent pl-10 pr-4 text-sm text-ink placeholder:text-subtle focus:outline-none" />
      </div>
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

const navLinks: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/marketplace", label: "Materials", icon: "box", end: true },
  { to: "/marketplace/vendors", label: "Vendors", icon: "store" },
];

export default function StorefrontLayout() {
  useTheme("storefront");
  const { user } = useAuth();
  return (
    <div className="theme-root flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:h-16 lg:h-[72px] lg:gap-8 lg:px-8">
          <Brand />
          <div className="hidden max-w-2xl flex-1 md:block">
            <SearchBar />
          </div>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Main">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => cx("hidden min-h-[44px] items-center gap-1.5 rounded-ui px-3 text-sm font-medium transition-colors lg:inline-flex", isActive ? "text-accent" : "text-muted hover:text-ink")}
              >
                <Icon name={l.icon} className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <ButtonLink to={homeFor(user.role)} icon="dashboard">
                My workspace
              </ButtonLink>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-[44px] items-center rounded-ui px-3 text-sm font-medium text-ink transition-colors hover:text-accent">
                  Log in
                </Link>
                <ButtonLink to="/register">Sign up</ButtonLink>
              </>
            )}
          </nav>
        </div>
        <div className="border-t border-line px-4 py-3 md:hidden">
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
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">AI-assisted construction estimation with a verified vendor marketplace. Estimate, source and compare in one place.</p>
            <div className="mt-5 flex gap-2">
              {(["mail", "phone", "globe"] as IconName[]).map((i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted">
                  <Icon name={i} className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          <FooterColumn
            title="Marketplace"
            links={[
              { to: "/marketplace", label: "Browse materials" },
              { to: "/marketplace/vendors", label: "Vendor directory" },
            ]}
          />
          <FooterColumn
            title="Customers"
            links={[
              { to: "/register", label: "Create an account" },
              { to: "/login", label: "Log in" },
            ]}
          />
          <FooterColumn
            title="Vendors"
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
