import { supabase } from "@/integrations/supabase/client";

export function publicUrl(path: string | null | undefined): string {
  if (!path) return "";
  return supabase.storage.from("magazines").getPublicUrl(path).data.publicUrl;
}

export function pad(n: number, width = 4) {
  return String(n).padStart(width, "0");
}
