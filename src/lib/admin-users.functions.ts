import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CreateInput = { email: string; password: string };
type DeleteInput = { userId: string };
type PromoteInput = { userId: string };

export type RegisteredUser = {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  roles: string[];
  isAdmin: boolean;
  isRedactor: boolean;
};

async function ensureAdmin(supabase: SupabaseClient, userId: string) {
  const { data: isAdminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdminRow) throw new Error("No autorizado");
}

/** All registered accounts (Auth users) with roles — admin only. No password/edit fields. */
export async function listRegisteredUsers(supabase: SupabaseClient, userId: string) {
  await ensureAdmin(supabase, userId);

  const { data: listed, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;

  const { data: roleRows, error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role");
  if (roleErr) throw roleErr;

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  const ids = (listed.users ?? []).map((u) => u.id);
  let profilesMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    profilesMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name as string | null]),
    );
  }

  const users: RegisteredUser[] = (listed.users ?? [])
    .map((u) => {
      const roles = rolesByUser.get(u.id) ?? [];
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        display_name: profilesMap.get(u.id) ?? null,
        roles,
        isAdmin: roles.includes("admin"),
        isRedactor: roles.includes("redactor"),
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return { users };
}

/** @deprecated Prefer listRegisteredUsers — kept for callers that only need redactors. */
export async function listRedactors(supabase: SupabaseClient, userId: string) {
  const { users } = await listRegisteredUsers(supabase, userId);
  return { users: users.filter((u) => u.isRedactor) };
}

/** Create a plain registered account (no staff role). Mini-CRUD create without edit. */
export async function createRegisteredUser(
  supabase: SupabaseClient,
  userId: string,
  data: CreateInput,
) {
  if (!data?.email || !data?.password) throw new Error("Email y contraseña requeridos");
  if (data.password.length < 10) throw new Error("Contraseña mínima 10 caracteres");

  await ensureAdmin(supabase, userId);

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("No se pudo crear");
  return { id: created.user.id };
}

/** Promote an existing account to redactor (articles + images; not revistas). */
export async function promoteToRedactor(
  supabase: SupabaseClient,
  adminUserId: string,
  data: PromoteInput,
) {
  if (!data?.userId) throw new Error("userId requerido");
  await ensureAdmin(supabase, adminUserId);

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
  if (!target?.user) throw new Error("Usuario no encontrado");

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.userId);
  const roleSet = new Set((roles ?? []).map((r) => r.role));
  if (roleSet.has("admin")) throw new Error("No se puede cambiar el rol de un admin");
  if (roleSet.has("redactor")) throw new Error("Ya es redactor");

  const { error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: data.userId, role: "redactor" });
  if (error) throw error;
  return { ok: true, role: "redactor" as const };
}

/** Remove redactor role only (does not delete the account). */
export async function demoteRedactor(
  supabase: SupabaseClient,
  adminUserId: string,
  data: PromoteInput,
) {
  if (!data?.userId) throw new Error("userId requerido");
  await ensureAdmin(supabase, adminUserId);

  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", data.userId)
    .eq("role", "redactor");
  if (error) throw error;
  return { ok: true };
}

/** Delete a non-admin account (Auth user + roles). */
export async function deleteRegisteredUser(
  supabase: SupabaseClient,
  adminUserId: string,
  data: DeleteInput,
) {
  if (!data?.userId) throw new Error("userId requerido");
  if (data.userId === adminUserId) throw new Error("No puedes eliminarte a ti mismo");

  await ensureAdmin(supabase, adminUserId);

  const { data: adminRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRole) throw new Error("No se pueden eliminar cuentas admin");

  await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
  if (error) throw error;
  return { ok: true };
}

// Back-compat aliases used by older routes/tests
export async function createRedactor(
  supabase: SupabaseClient,
  userId: string,
  data: CreateInput,
) {
  const created = await createRegisteredUser(supabase, userId, data);
  await promoteToRedactor(supabase, userId, { userId: created.id });
  return created;
}

export async function deleteRedactor(
  supabase: SupabaseClient,
  userId: string,
  data: DeleteInput,
) {
  return deleteRegisteredUser(supabase, userId, data);
}

/** Pure capability checks for redactor vs magazines (unit-tested). */
export function redactorCapabilities() {
  return {
    canPublishArticles: true,
    canUploadArticleImages: true,
    canManageMagazines: false,
    canAccessAdminRevistas: false,
    canAccessAdminNewspaper: true,
  } as const;
}
