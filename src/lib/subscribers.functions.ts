import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getSubscriberCount() {
  const { count, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
}
