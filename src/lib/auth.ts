import { createClient } from "@/lib/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("No autorizado");
  }

  return { supabase, userId: user.id };
}

export async function requireAdmin() {
  const { supabase, userId } = await requireAuth();
  const { data: isAdminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!isAdminRow) {
    throw new Error("No autorizado");
  }

  return { supabase, userId };
}
