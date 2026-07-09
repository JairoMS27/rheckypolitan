import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAuthenticatedSupabase(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishable =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishable) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, supabasePublishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { supabase, userId: data.user.id };
}
