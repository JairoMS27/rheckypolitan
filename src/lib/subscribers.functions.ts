import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSubscriberCount = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
});
