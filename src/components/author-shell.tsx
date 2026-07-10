"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ADMIN_DASHBOARD_PATH,
  authorPostNewPath,
  authorPostsListPath,
  HOME_PATH,
} from "@/lib/dashboard-paths";

export function AuthorShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cargando…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">Inicia sesión para publicar</p>
        <Link href="/login?next=/publicar" className="text-xs uppercase tracking-widest underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const nav = [
    { href: authorPostsListPath(), label: "Mis artículos", match: (p: string) => p === "/publicar" },
    {
      href: authorPostNewPath(),
      label: "Nuevo artículo",
      match: (p: string) => p.startsWith("/publicar/nuevo"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)",
        }}
        aria-hidden
      />
      <header className="border-b border-foreground/15">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-4">
            <Link href={HOME_PATH} className="font-display text-xl hover:text-[#B22234]">
              Rheckypolitan
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#B22234]">
              Publicar artículos
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-mono text-[10px] uppercase tracking-widest transition hover:text-[#B22234] ${
                  item.match(pathname ?? "")
                    ? "text-foreground underline underline-offset-4"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/profile"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Perfil
            </Link>
            {isAdmin && (
              <Link
                href={ADMIN_DASHBOARD_PATH}
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Panel admin
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push(HOME_PATH);
              }}
            >
              Salir
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
