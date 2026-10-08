import type { IconName } from "./components/Icon";

export function homeFor(role: string) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/dashboard";
}

export type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

export const navFor: Record<string, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Overview", icon: "dashboard", end: true },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/vendors", label: "Vendors", icon: "store" },
    { to: "/admin/projects", label: "Projects", icon: "folder" },
    { to: "/admin/rates", label: "Reference rates", icon: "rates" },
    { to: "/admin/audit", label: "Audit log", icon: "audit" },
  ],
  customer: [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard", end: true },
    { to: "/projects", label: "Projects", icon: "folder" },
    { to: "/notifications", label: "Notifications", icon: "bell" },
  ],
  vendor: [
    { to: "/vendor", label: "Dashboard", icon: "dashboard", end: true },
    { to: "/vendor/catalog", label: "Catalog", icon: "box" },
    { to: "/vendor/rfqs", label: "RFQ inbox", icon: "mail" },
    { to: "/vendor/quotations", label: "My quotations", icon: "quote" },
    { to: "/vendor/profile", label: "Company profile", icon: "profile" },
    { to: "/notifications", label: "Notifications", icon: "bell" },
  ],
};
