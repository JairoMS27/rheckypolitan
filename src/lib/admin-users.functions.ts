import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateInput = { email: string; password: string };
type DeleteInput = { userId: string };

export const listRedactors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) throw new Error("No autorizado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  });

export const createRedactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => {
    if (!d?.email || !d?.password) throw new Error("Email y contraseña requeridos");
    if (d.password.length < 6) throw new Error("Contraseña mínima 6 caracteres");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) throw new Error("No autorizado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  });

export const deleteRedactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: DeleteInput) => {
    if (!d?.userId) throw new Error("userId requerido");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) throw new Error("No autorizado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });
