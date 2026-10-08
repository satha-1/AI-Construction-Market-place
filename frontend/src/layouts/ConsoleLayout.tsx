import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { GeoPattern } from "../components/ui";
import { cx, initials, timeAgo } from "../lib/format";
import { useTheme } from "../lib/theme";
import { homeFor, navFor } from "../roles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const labels: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  projects: "Projects",
  rfqs: "RFQs",
  boq: "BOQ",
  documents: "Documents",
  verification: "Verification",
  audit: "Audit log",
  agent: "Assistant",
  vendor: "Vendor",
  catalog: "Catalog",
  quotations: "Quotations",
  profile: "Profile",
  notifications: "Notifications",
  users: "Users",
  vendors: "Vendors",
  rates: "Reference rates",
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    to: "/" + segments.slice(0, i + 1).join("/"),
    label: UUID.test(seg) ? "Detail" : (labels[seg] ?? seg),
  }));
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[11px] sm:flex">
      <span className="label-caps">Conapp</span>
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex items-center gap-2">
          <span className="text-subtle">/</span>
          {i === crumbs.length - 1 ? (
            <span className="truncate font-bold text-ink">{c.label}</span>
          ) : (
            <Link to={c.to} className="text-muted transition-colors hover:text-ink">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function NotificationBell() {
  const { data } = useQuery({ queryKey: ["notifications", "bell"], queryFn: () => api.notifications(), refetchInterval: 30000 });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const unread = data?.unread ?? 0;
  const items = (data?.items ?? []).slice(0, 5);

  async function openItem(id: string, link: string | null) {
    await api.markNotificationRead(id).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    setOpen(false);
    if (link) navigate(link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="focus-ring relative flex h-11 w-11 items-center justify-center rounded-ui text-muted transition-colors hover:bg-accent-soft hover:text-ink"
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="label-caps">Notifications</span>
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-[11px] font-bold text-ink hover:underline">
              View all
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">You're all caught up.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n.id, n.link)}
                    className="flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-soft"
                  >
                    <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.is_read ? "bg-line" : "bg-accent")} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-ink">{n.title}</span>
                      {n.body ? <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted">{n.body}</span> : null}
                      <span className="mt-1 block text-[10px] text-subtle">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-ui border border-line bg-soft text-[11px] font-bold text-ink transition-colors hover:border-ink"
      >
        {initials(user.full_name)}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-card border border-line bg-surface shadow-lift">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-xs font-bold text-ink">{user.full_name}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
            <p className="label-caps mt-2">{user.role}</p>
          </div>
          <Link to="/marketplace" className="flex items-center gap-2 px-4 py-3 text-xs text-muted transition-colors hover:bg-soft hover:text-ink" onClick={() => setOpen(false)}>
            <Icon name="external" /> Browse marketplace
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-xs text-danger transition-colors hover:bg-soft">
            <Icon name="logout" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = navFor[user?.role ?? "customer"] ?? [];
  return (
    <div className="flex h-full flex-col bg-surface">
      <Link to={homeFor(user?.role ?? "customer")} onClick={onNavigate} className="relative flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-line px-6">
        <GeoPattern variant="blocks" className="absolute inset-0 h-full w-full text-subtle opacity-30" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-ui bg-accent text-[11px] font-bold text-accent-fg">C</span>
        <span className="relative text-sm font-bold tracking-tight text-ink">Conapp</span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Primary">
        <p className="label-caps px-3 pb-2 pt-1">{user?.role} workspace</p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                "focus-ring flex min-h-[44px] items-center gap-3 rounded-ui border px-3 text-xs font-medium transition-all duration-ui ease-ui",
                isActive ? "border-ink bg-accent text-accent-fg" : "border-transparent text-muted hover:border-line hover:bg-soft hover:text-ink",
              )
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <Link to="/marketplace" onClick={onNavigate} className="flex min-h-[44px] items-center gap-3 rounded-ui border border-line px-3 text-xs text-muted transition-colors hover:border-ink hover:text-ink">
          <Icon name="store" /> Marketplace
        </Link>
      </div>
    </div>
  );
}

export default function ConsoleLayout() {
  useTheme("console");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => setMobileNav(false), [pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`/marketplace${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  }

  return (
    <div className="theme-root">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line lg:block">
        <Sidebar />
      </aside>

      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-line">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-ui text-muted hover:bg-accent-soft lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Breadcrumbs />
          <form onSubmit={onSearch} className="ml-auto hidden w-full max-w-xs md:block" role="search">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search marketplace…"
                aria-label="Search marketplace"
                className="min-h-[40px] w-full rounded-ui border border-line bg-soft pl-9 pr-3 text-xs text-ink placeholder:text-subtle transition-colors focus:border-accent focus:bg-surface focus:outline-none"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
