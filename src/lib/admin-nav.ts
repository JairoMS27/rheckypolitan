/**
 * Pure staff admin information architecture.
 * Free of React so unit tests can assert destinations and labels.
 */

import {
  ADMIN_DASHBOARD_PATH,
  authorPostNewPath,
} from "@/lib/dashboard-paths";

export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  /** admin = only admin role; staff = admin or redactor */
  access: "admin" | "staff";
  /** True when this link leaves the magazine admin surface for articles */
  isAuthorSurface?: boolean;
};

/** Admin catalog of every author's articles. */
export const ADMIN_POSTS_PATH = `${ADMIN_DASHBOARD_PATH}/posts`;

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

/** Canonical staff IA: revistas vs sitio vs equipo vs escritura (artículos). */
export function getAdminNavGroups(): AdminNavGroup[] {
  return [
    {
      id: "revistas",
      label: "Revistas",
      items: [
        {
          id: "issues",
          label: "Archivo",
          href: ADMIN_DASHBOARD_PATH,
          access: "admin",
        },
        {
          id: "new-issue",
          label: "Nueva revista",
          href: `${ADMIN_DASHBOARD_PATH}/new`,
          access: "admin",
        },
        {
          id: "newspaper",
          label: "Periódico",
          href: `${ADMIN_DASHBOARD_PATH}/newspaper`,
          access: "staff",
        },
      ],
    },
    {
      id: "sitio",
      label: "Sitio",
      items: [
        {
          id: "subscribers",
          label: "Suscriptores",
          href: `${ADMIN_DASHBOARD_PATH}/subscribers`,
          access: "admin",
        },
      ],
    },
    {
      id: "equipo",
      label: "Equipo",
      items: [
        {
          id: "users",
          label: "Usuarios",
          href: `${ADMIN_DASHBOARD_PATH}/users`,
          access: "admin",
        },
      ],
    },
    {
      id: "escritura",
      label: "Escritura",
      items: [
        {
          id: "articles",
          label: "Artículos",
          href: ADMIN_POSTS_PATH,
          access: "admin",
        },
        {
          id: "new-article",
          label: "Nuevo artículo",
          href: authorPostNewPath(),
          access: "staff",
          isAuthorSurface: true,
        },
      ],
    },
  ];
}

export function filterAdminNavForRole(
  groups: AdminNavGroup[],
  opts: { isAdmin: boolean; isStaff: boolean },
): AdminNavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.access === "admin") return opts.isAdmin;
        return opts.isStaff;
      }),
    }))
    .filter((g) => g.items.length > 0);
}

/** Active match for nav highlighting (exact or nested edit routes). */
export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (!pathname) return false;
  if (item.isAuthorSurface) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  if (item.id === "issues") {
    return (
      pathname === ADMIN_DASHBOARD_PATH ||
      pathname === `${ADMIN_DASHBOARD_PATH}/` ||
      Boolean(pathname.match(/^\/admin\/[^/]+\/edit/))
    );
  }
  if (item.id === "new-issue") {
    return pathname === `${ADMIN_DASHBOARD_PATH}/new`;
  }
  if (item.id === "articles") {
    return (
      pathname === ADMIN_POSTS_PATH ||
      pathname.startsWith(`${ADMIN_POSTS_PATH}/`)
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function adminSectionKicker(pathname: string): string {
  if (pathname.startsWith("/admin/newspaper")) return "Revistas · Periódico";
  if (pathname.startsWith("/admin/subscribers")) return "Sitio · Newsletter";
  if (pathname.startsWith("/admin/users")) return "Equipo · Usuarios";
  if (pathname.startsWith(ADMIN_POSTS_PATH)) return "Escritura · Artículos";
  if (pathname === "/admin/new") return "Revistas · Nuevo número";
  if (pathname.match(/^\/admin\/[^/]+\/edit/)) return "Revistas · Editar número";
  if (pathname === "/admin" || pathname === "/admin/") return "Revistas · Archivo";
  return "Panel editorial";
}
