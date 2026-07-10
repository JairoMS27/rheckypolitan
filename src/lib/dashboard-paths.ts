/**
 * Pure routing helpers for post-login navigation and author vs staff surfaces.
 * Kept free of Next/React so unit tests can assert destinations without mounting.
 */

export const HOME_PATH = "/";
export const AUTHOR_PUBLISH_BASE = "/publicar";
export const ADMIN_DASHBOARD_PATH = "/admin";

export type StaffRole = "admin" | "redactor";

export function postLoginDestination(_roles?: readonly string[]): string {
  // Everyone lands on the public home; staff open admin from the menu.
  return HOME_PATH;
}

export function authorPublishBasePath(): string {
  return AUTHOR_PUBLISH_BASE;
}

export function authorPostsListPath(): string {
  return AUTHOR_PUBLISH_BASE;
}

export function authorPostNewPath(): string {
  return `${AUTHOR_PUBLISH_BASE}/nuevo`;
}

export function authorPostEditPath(id: string): string {
  return `${AUTHOR_PUBLISH_BASE}/${id}/edit`;
}

export function isStaffRole(roles: readonly string[]): boolean {
  return roles.includes("admin") || roles.includes("redactor");
}

export function isAdminRole(roles: readonly string[]): boolean {
  return roles.includes("admin");
}

/**
 * Any logged-in account may publish artículos (and images under posts/).
 * Staff roles are not required. Revistas remain admin-only elsewhere.
 */
export function canPublishArticles(isAuthenticated: boolean): boolean {
  return isAuthenticated;
}

/** True when path is the public author publish surface. */
export function isAuthorPublishPath(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === AUTHOR_PUBLISH_BASE || pathname.startsWith(`${AUTHOR_PUBLISH_BASE}/`);
}

/**
 * Map legacy staff article URLs to the author publish surface.
 * Returns null if the path is not a legacy posts URL.
 */
export function legacyAdminPostsToAuthorPath(pathname: string): string | null {
  if (!pathname) return null;
  if (pathname === "/admin/posts" || pathname === "/admin/posts/") {
    return authorPostsListPath();
  }
  if (pathname === "/admin/posts/new" || pathname === "/admin/articulos" || pathname === "/admin/articulos/") {
    return authorPostNewPath();
  }
  const edit = pathname.match(/^\/admin\/posts\/([^/]+)\/edit\/?$/);
  if (edit?.[1]) return authorPostEditPath(edit[1]);
  const articulosEdit = pathname.match(/^\/admin\/articulos\/([^/]+)\/edit\/?$/);
  if (articulosEdit?.[1]) return authorPostEditPath(articulosEdit[1]);
  if (pathname.startsWith("/admin/articulos/")) return authorPostsListPath();
  return null;
}
