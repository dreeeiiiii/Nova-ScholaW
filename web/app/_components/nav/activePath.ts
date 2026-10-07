/** Visual navigation grouping only; route authorization stays server-side. */
export function matchesNavPath(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/admin/events" && (pathname.startsWith("/gallery") || pathname.startsWith("/admin/moderation") || pathname.startsWith("/admin/categories"))) return true;
  if (path === "/admin/departments" && pathname.startsWith("/admin/users")) return true;
  return pathname === path || pathname.startsWith(path + "/");
}
