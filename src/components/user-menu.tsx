"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ADMIN_DASHBOARD_PATH,
  authorPostNewPath,
  authorPostsListPath,
} from "@/lib/dashboard-paths";

export function UserMenu() {
  const { user, isAdmin, loading } = useAuth();
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
    username: string | null;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, avatar_url, username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(
          data ?? {
            display_name: user.email?.split("@")[0] ?? "Lector",
            avatar_url: null,
            username: null,
          },
        );
      });
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Enter: mount then animate in. Exit: subtle translateY then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 150);
    return () => window.clearTimeout(t);
  }, [open]);

  if (loading) {
    return <div className="h-10 w-16 animate-pulse bg-muted" />;
  }

  if (!user || !profile) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors duration-150 ease-out hover:text-[#B22234]"
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
        href={authorPostNewPath()}
        className="pressable hidden min-h-10 items-center gap-1.5 border border-[#B22234] bg-[#B22234] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:border-[#8B1A29] hover:bg-[#8B1A29] sm:inline-flex"
      >
        <span aria-hidden>✎</span> Publicar artículo
      </Link>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex min-h-10 min-w-10 items-center gap-2 transition-colors duration-150 ease-out hover:text-[#B22234] active:scale-[0.96]"
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center overflow-hidden bg-foreground font-mono text-[9px] font-bold text-background">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="media-outline h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:inline">
          {profile.display_name}
        </span>
      </button>

      {mounted && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 min-w-[220px] border border-foreground/15 bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] transition-[opacity,transform,filter] duration-150 ease-out ${
            visible
              ? "translate-y-0 opacity-100 blur-0"
              : "-translate-y-2 opacity-0 blur-[4px]"
          }`}
        >
          <div className="border-b border-foreground/10 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sesión activa
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{profile.display_name}</p>
          </div>
          <Link
            href={authorPostNewPath()}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#B22234] transition-[background-color,color] duration-150 ease-out hover:bg-muted sm:hidden"
          >
            ✎ Publicar artículo
          </Link>
          <Link
            href="/feed"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground"
          >
            Mi feed
          </Link>
          <Link
            href={authorPostsListPath()}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground"
          >
            Mis artículos
          </Link>
          {profile.username && (
            <Link
              href={`/u/${encodeURIComponent(profile.username)}`}
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground"
            >
              Ver mi perfil
            </Link>
          )}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground"
          >
            Ajustes
          </Link>
          {isAdmin && (
            <Link
              href={ADMIN_DASHBOARD_PATH}
              onClick={() => setOpen(false)}
              className="block w-full border-t border-foreground/10 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground"
            >
              Panel admin · revistas
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              window.location.href = "/";
            }}
            className="w-full border-t border-foreground/10 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-muted hover:text-[#B22234]"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
