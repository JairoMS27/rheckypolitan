/** Paths that stay reachable while maintenance mode is on (staff + toggle API only). */
export function isMaintenanceExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
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