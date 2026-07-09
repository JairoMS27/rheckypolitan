import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "redactor";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async (uid: string) => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) {
        console.error("[useAuth] No se pudieron cargar los roles:", error.message);
        setRoles([]);
        return;
      }
      setRoles((data ?? []).map((r) => r.role as AppRole));
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        await loadRoles(s.user.id);
        setLoading(false);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadRoles(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isRedactor = roles.includes("redactor");

  return { session, user, roles, isAdmin, isRedactor, loading };
}
