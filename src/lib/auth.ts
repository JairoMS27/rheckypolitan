import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";
import { authorPostsListPath, isAdminRole, isStaffRole } from "@/lib/dashboard-paths";

export type AppRole = "admin" | "redactor";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, userId: null as string | null, roles: [] as AppRole[] };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((r) => r.role as AppRole);
  return { supabase, user, userId: user.id, roles };
}

export async function requireAuth() {
  const auth = await getAuthUser();
  if (!auth.userId) {
    throw new Error("No autorizado");
  }
  return {
    supabase: auth.supabase,
    userId: auth.userId,
    roles: auth.roles,
    isAdmin: isAdminRole(auth.roles),
    isRedactor: auth.roles.includes("redactor"),
    isStaff: isStaffRole(auth.roles),
  };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (!auth.isAdmin) {
    throw new Error("No autorizado");
  }
  return auth;
}

/** Any logged-in user may use the author publish surface (`/publicar`). */
export async function requireAuthPage() {
  const auth = await getAuthUser();
  if (!auth.userId) {
    redirect("/login?next=/publicar");
  }
  return {
    supabase: auth.supabase,
    userId: auth.userId,
    roles: auth.roles,
    isAdmin: isAdminRole(auth.roles),
    isRedactor: auth.roles.includes("redactor"),
    isStaff: isStaffRole(auth.roles),
  };
}

/** Server-side guard for any /admin page (admin or redactor). Redirects if not staff. */
export async function requireStaffPage() {
  const auth = await getAuthUser();
  if (!auth.userId) {
    redirect("/login");
  }
  const isAdmin = isAdminRole(auth.roles);
  const isRedactor = auth.roles.includes("redactor");
  if (!isAdmin && !isRedactor) {
    redirect("/");
  }
  return {
    supabase: auth.supabase,
    userId: auth.userId,
    roles: auth.roles,
    isAdmin,
    isRedactor,
  };
}

/** Server-side guard for admin-only magazine/staff pages. */
export async function requireAdminPage() {
  const auth = await requireStaffPage();
  if (!auth.isAdmin) {
    redirect(authorPostsListPath());
  }
  return auth;
}
