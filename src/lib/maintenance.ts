/** Paths that stay reachable while maintenance mode is on. */
export function isMaintenanceExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
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