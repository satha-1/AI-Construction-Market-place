import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../api";
import { useAuth } from "../auth";

const customerLinks = [
  { to: "/projects", label: "Projects" },
  { to: "/marketplace", label: "Marketplace" },
];

const vendorLinks = [
  { to: "/vendor", label: "Vendor portal" },
  { to: "/marketplace", label: "Marketplace" },
];

const adminLinks = [
  { to: "/admin", label: "Admin" },
  { to: "/projects", label: "Projects" },
  { to: "/marketplace", label: "Marketplace" },
];

export default function Layout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === "admin" ? adminLinks : user?.role === "vendor" ? vendorLinks : customerLinks;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Conapp</p>
            <p className="text-lg font-semibold">Construction estimation</p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? "font-semibold text-amber-800" : "text-slate-600")}
              >
                {link.label}
              </NavLink>
            ))}
            <span className="text-slate-400">{user?.full_name}</span>
            <button
              className="rounded border border-slate-300 px-3 py-1"
              onClick={() => {
                clearToken();
                setUser(null);
                navigate("/login");
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
