import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CreateInput = { email: string; password: string };
type DeleteInput = { userId: string };

async function ensureAdmin(supabase: SupabaseClient, userId: string) {
  const { data: isAdminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdminRow) throw new Error("No autorizado");
}

export async function listRedactors(supabase: SupabaseClient, userId: string) {
  await ensureAdmin(supabase, userId);

  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role, created_at")
    .eq("role", "redactor");
  if (error) throw error;

  const ids = (roles ?? []).map((r) => r.user_id);
  const users: { id: string; email: string; created_at: string }[] = [];
  for (const id of ids) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    if (data?.user) {
      users.push({
        id: data.user.id,
        email: data.user.email ?? "",
        created_at: data.user.created_at,
      });
    }
  }
  return { users };
}

export async function createRedactor(supabase: SupabaseClient, userId: string, data: CreateInput) {
  if (!data?.email || !data?.password) throw new Error("Email y contraseña requeridos");
  if (data.password.length < 6) throw new Error("Contraseña mínima 6 caracteres");

  await ensureAdmin(supabase, userId);

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("No se pudo crear");
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: created.user.id, role: "redactor" });
  if (roleErr) throw roleErr;
  return { id: created.user.id };
}

export async function deleteRedactor(supabase: SupabaseClient, userId: string, data: DeleteInput) {
  if (!data?.userId) throw new Error("userId requerido");

  await ensureAdmin(supabase, userId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
  if (error) throw error;
  return { ok: true };
}
