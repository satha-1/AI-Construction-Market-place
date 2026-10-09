import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { IconTile } from "../components/ui";
import { cx, initials, timeAgo, titleCase } from "../lib/format";
import { useTheme } from "../lib/theme";
import { notificationVisual } from "../lib/visuals";
import { homeFor, navFor } from "../roles";
import { Brand } from "./StorefrontLayout";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const labels: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  projects: "Projects",
  rfqs: "RFQs",
  boq: "BOQ & estimate",
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

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useRef(onOutside);
  handler.current = onOutside;
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && handler.current();
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return ref;
}

function Breadcrumbs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    to: "/" + segments.slice(0, i + 1).join("/"),
    label: UUID.test(seg) ? "Details" : (labels[seg] ?? titleCase(seg)),
  }));
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
      <Link to={homeFor(user?.role ?? "customer")} className="text-subtle transition-colors hover:text-accent" aria-label="Home">
        <Icon name="home" className="h-4 w-4" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1.5">
          <Icon name="chevron" className="h-3.5 w-3.5 text-subtle" />
          {i === crumbs.length - 1 ? (
            <span className="truncate font-semibold text-ink">{c.label}</span>
          ) : (
            <Link to={c.to} className="text-muted transition-colors hover:text-accent">
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
  const ref = useClickOutside(() => setOpen(false));
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
        className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 ? <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
            <span className="text-sm font-bold text-ink">Notifications</span>
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-accent hover:underline">
              View all
            </Link>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Icon name="checkCircle" className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-2 text-sm text-muted">You're all caught up.</p>
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n.id, n.link)} className={cx("flex w-full gap-3 border-b border-line bg-white px-4 py-3 text-left transition-colors last:border-0 hover:bg-soft", !n.is_read && "bg-accent-soft")}>
                    <IconTile {...notificationVisual(n.kind)} size="sm" round />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{n.title}</span>
                      {n.body ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span> : null}
                      <span className="mt-1 block text-[11px] text-subtle">{timeAgo(n.created_at)}</span>
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
  const ref = useClickOutside(() => setOpen(false));
  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Account menu" className="focus-ring flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-soft">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-secondary text-xs font-bold text-white">{initials(user.full_name)}</span>
        <span className="hidden text-left lg:block">
          <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-ink">{user.full_name}</span>
          <span className="block text-[11px] capitalize leading-tight text-muted">{user.role}</span>
        </span>
        <Icon name="chevronDown" className="hidden h-4 w-4 text-subtle lg:block" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-card border border-line bg-white shadow-lift">
          <div className="border-b border-line bg-white px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.full_name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link to="/marketplace" className="flex items-center gap-3 px-4 py-3 text-sm text-ink transition-colors hover:bg-soft" onClick={() => setOpen(false)}>
            <Icon name="store" className="h-4 w-4 text-muted" /> Browse marketplace
          </Link>
          <Link to="/notifications" className="flex items-center gap-3 px-4 py-3 text-sm text-ink transition-colors hover:bg-soft" onClick={() => setOpen(false)}>
            <Icon name="bell" className="h-4 w-4 text-muted" /> Notifications
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50">
            <Icon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const sections = navFor[user?.role ?? "customer"] ?? [];
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-6">
        <Brand to={homeFor(user?.role ?? "customer")} />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6" aria-label="Primary">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="label-caps mb-2 px-3">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        "focus-ring flex min-h-[44px] items-center gap-3 rounded-ui px-3 text-sm transition-all duration-ui ease-ui",
                        isActive ? "bg-accent-soft font-semibold text-teal-700" : "font-medium text-muted hover:bg-soft hover:text-ink",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} className={cx("h-[18px] w-[18px]", isActive ? "text-accent" : "text-subtle")} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4">
        <Link to="/marketplace" onClick={onNavigate} className="group flex items-center gap-3 rounded-card bg-gradient-to-br from-accent-soft to-sky-50 p-4 transition-all duration-ui hover:shadow-lift">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent shadow-card">
            <Icon name="store" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Marketplace</span>
            <span className="block text-xs text-muted">Browse materials & vendors</span>
          </span>
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
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-line bg-white shadow-lift">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6 lg:px-8">
          <button type="button" className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-soft lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Breadcrumbs />
          <form onSubmit={onSearch} className="ml-auto hidden w-full max-w-sm md:block" role="search">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search materials or vendors…"
                aria-label="Search marketplace"
                className="min-h-[40px] w-full rounded-full border border-line bg-soft pl-10 pr-4 text-sm text-ink placeholder:text-subtle transition-colors focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/10"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-3">
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
