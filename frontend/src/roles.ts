export function homeFor(role: string) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/projects";
}
