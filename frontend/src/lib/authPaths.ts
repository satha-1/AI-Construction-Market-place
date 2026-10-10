/** Build login/register URLs that preserve where the user was going and intended role. */
export function authPath(opts: {
  mode?: "login" | "register";
  role?: "customer" | "vendor";
  from?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.role) params.set("role", opts.role);
  const q = params.toString();
  return `/${opts.mode ?? "register"}${q ? `?${q}` : ""}`;
}

/** Where guests go when they try to request a quote / start a project. */
export const quoteAuthPath = authPath({ mode: "register", role: "customer", from: "/projects" });

/** Where guests go when they want to sell / manage a catalog. */
export const vendorAuthPath = authPath({ mode: "register", role: "vendor", from: "/vendor" });
