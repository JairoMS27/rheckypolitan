import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(
          data ?? {
            display_name: user.email?.split("@")[0] ?? "Lector",
            avatar_url: null,
          }
        );
      });
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return (
      <div className="h-5 w-16 animate-pulse bg-muted" />
    );
  }

  if (!user || !profile) {
    return (
      <Link
        to="/auth/login"
        search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/" }}
        className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234] transition-colors"
      >
        Iniciar sesión
      </Link>
    );
  }

  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={menuRef} className="relative flex items-center gap-3">
      <Link
        to="/admin/posts/new"
        className="hidden items-center gap-1.5 border border-[#B22234] bg-[#B22234] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#8B1A29] hover:border-[#8B1A29] sm:inline-flex"
      >
        <span aria-hidden>✎</span> Publicar artículo
      </Link>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition-colors hover:text-[#B22234]"
        aria-label="Menú de usuario"
      >
        <div className="flex h-6 w-6 items-center justify-center overflow-hidden bg-foreground font-mono text-[8px] font-bold text-background">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:inline">
          {profile.display_name}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] border border-foreground/15 bg-background shadow-lg">
          <div className="border-b border-foreground/10 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sesión activa
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {profile.display_name}
            </p>
          </div>
          <Link
            to="/admin/posts/new"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#B22234] transition hover:bg-muted sm:hidden"
          >
            ✎ Publicar artículo
          </Link>
          <Link
            to="/admin/posts"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Mis artículos
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Editar perfil
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              window.location.reload();
            }}
            className="w-full border-t border-foreground/10 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:bg-muted hover:text-[#B22234]"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
