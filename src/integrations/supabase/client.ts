import { createClient as createBrowserClient } from "@/lib/client";

let _supabase: ReturnType<typeof createBrowserClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createBrowserClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});