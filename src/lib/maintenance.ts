/** Paths that stay reachable while maintenance mode is on (staff + authors + toggle API). */
export function isMaintenanceExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/publicar" || pathname.startsWith("/publicar/")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/api/admin/maintenance") return true;
  if (pathname === "/api/maintenance/status") return true;
  return false;
}

export function shouldShowMaintenanceScreen(
  pathname: string,
  maintenanceMode: boolean,
): boolean {
  if (!maintenanceMode) return false;
  return !isMaintenanceExemptPath(pathname);
}

export const MAINTENANCE_TEST_ID = "maintenance-screen";