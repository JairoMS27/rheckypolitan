import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedSupabase } from "@/lib/api-auth";

export async function requireAdminFromRequest(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return null;

  const { data: isAdmin } = await auth.supabase.rpc("has_role", {
    _user_id: auth.userId,
    _role: "admin",
  });

  if (!isAdmin) return null;
  return auth;
}