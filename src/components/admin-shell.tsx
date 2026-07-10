"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MaintenanceToggle } from "@/components/maintenance/maintenance-toggle";
import { authorPostsListPath, HOME_PATH } from "@/lib/dashboard-paths";

/**
 * Staff dashboard shell: revistas, periódico and site tools.
 * Article publishing for authors lives under /publicar (AuthorShell).
 */
export function AdminShell({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isAdmin, isRedactor, loading } = useAuth();
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl">Acceso restringido</p>
        <Link href="/login" className="text-xs uppercase tracking-widest underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const isStaff = isAdmin || isRedactor;

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">Sección sólo para admin</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Aquí se gestionan revistas y herramientas de sitio. Tus artículos están en Publicar.
        </p>
        <Link
          href={authorPostsListPath()}
          className="text-xs uppercase tracking-widest underline"
        >
          Ir a mis artículos
        </Link>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">Panel de administración</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta zona es solo para el equipo editorial (revistas y staff). Para publicar artículos
          usa tu espacio de autor.
        </p>
        <Link
          href={authorPostsListPath()}
          className="text-xs uppercase tracking-widest underline"
        >
          Publicar artículos →
        </Link>
        <Link href={HOME_PATH} className="text-xs uppercase tracking-widest text-muted-foreground">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const roleLabel = isAdmin ? "Admin · revistas" : "Staff";

  const linkClass = (active: boolean) =>
    `font-mono text-[10px] uppercase tracking-widest transition hover:text-[#B22234] ${
      active ? "text-foreground underline underline-offset-4" : "text-muted-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-4">
            <Link href={HOME_PATH} className="font-display text-xl">
              Rheckypolitan
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B22234]">
              {roleLabel}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            {isAdmin && (
              <Link href="/admin" className={linkClass(pathname === "/admin")}>
                Revistas
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/new"
                className={linkClass(pathname === "/admin/new" || pathname?.includes("/edit"))}
              >
                Nueva revista
              </Link>
            )}
            {isStaff && (
              <Link
                href="/admin/newspaper"
                className={linkClass(pathname === "/admin/newspaper")}
              >
                Periódico
              </Link>
            )}
            {isAdmin && (
              <>
                <MaintenanceToggle />
                <Link href="/admin/users" className={linkClass(pathname === "/admin/users")}>
                  Redactores
                </Link>
                <Link
                  href="/admin/subscribers"
                  className={linkClass(pathname === "/admin/subscribers")}
                >
                  Suscriptores
                </Link>
              </>
            )}
            <Link
              href={authorPostsListPath()}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Artículos →
            </Link>
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
        <div className="border-t border-foreground/10 bg-muted/30 px-6 py-2">
          <p className="mx-auto max-w-[1400px] font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Panel staff · revistas y sitio · los artículos de autor viven en /publicar
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-10">{children}</main>
    </div>
  );
}
