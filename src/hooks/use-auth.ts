import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isEmailVerified } from "@/lib/auth-email";

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

    const applySession = async (s: Session | null) => {
      // Reject sessions from accounts that never confirmed email
      if (s?.user && !isEmailVerified(s.user)) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRoles([]);
        setLoading(false);
        return;
      }
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
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      await applySession(s);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isRedactor = roles.includes("redactor");
  const emailVerified = isEmailVerified(user);

  return {
    session,
    user,
    roles,
    isAdmin,
    isRedactor,
    emailVerified,
    loading,
  };
}
