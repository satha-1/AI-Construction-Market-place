import type { IconName } from "./components/Icon";

export function homeFor(role: string) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/dashboard";
}

export type NavItem = { to: string; label: string; icon: IconName; end?: boolean };
export type NavSection = { title: string; items: NavItem[] };

export const navFor: Record<string, NavSection[]> = {
  admin: [
    { title: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: "dashboard", end: true }] },
    {
      title: "Management",
      items: [
        { to: "/admin/users", label: "Users", icon: "users" },
        { to: "/admin/vendors", label: "Vendors", icon: "store" },
        { to: "/admin/projects", label: "Projects", icon: "folder" },
      ],
    },
    {
      title: "System",
      items: [
        { to: "/admin/rates", label: "Reference rates", icon: "calculator" },
        { to: "/admin/audit", label: "Audit log", icon: "shieldCheck" },
      ],
    },
  ],
  customer: [
    {
      title: "Workspace",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: "dashboard", end: true },
        { to: "/projects", label: "Projects", icon: "folder" },
      ],
    },
    { title: "Account", items: [{ to: "/notifications", label: "Notifications", icon: "bell" }] },
  ],
  vendor: [
    { title: "Overview", items: [{ to: "/vendor", label: "Dashboard", icon: "dashboard", end: true }] },
    {
      title: "Sales",
      items: [
        { to: "/vendor/catalog", label: "Catalog", icon: "box" },
        { to: "/vendor/rfqs", label: "RFQ inbox", icon: "inbox" },
        { to: "/vendor/quotations", label: "My quotations", icon: "file" },
      ],
    },
    {
      title: "Account",
      items: [
        { to: "/vendor/profile", label: "Company profile", icon: "building" },
        { to: "/notifications", label: "Notifications", icon: "bell" },
      ],
    },
  ],
};
