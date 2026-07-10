"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MaintenanceToggle } from "@/components/maintenance/maintenance-toggle";
import {
  filterAdminNavForRole,
  getAdminNavGroups,
  isAdminNavItemActive,
  type AdminNavItem,
} from "@/lib/admin-nav";
import { authorPostsListPath, HOME_PATH } from "@/lib/dashboard-paths";

/**
 * Redesigned staff dashboard shell.
 * Brand: Fraunces + mono + #B22234; IA groups revistas / sitio / equipo / escritura.
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
  const pathname = usePathname() ?? "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cargando panel…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Panel editorial
        </p>
        <p className="font-display text-3xl">Acceso restringido</p>
        <Link
          href="/login"
          className="font-mono text-[10px] uppercase tracking-widest underline underline-offset-4"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const isStaff = isAdmin || isRedactor;

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Solo admin
        </p>
        <p className="font-display text-3xl">Sección de revistas y sitio</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta herramienta es solo para administradores. Los artículos se publican en el espacio de
          escritura.
        </p>
        <Link
          href={authorPostsListPath()}
          className="border border-[#B22234] bg-[#B22234] px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white"
        >
          Ir a artículos →
        </Link>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Panel editorial
        </p>
        <p className="font-display text-3xl">Solo equipo</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          El panel admin gestiona revistas y el sitio. Para publicar artículos usa tu espacio de
          autor.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={authorPostsListPath()}
            className="border border-[#B22234] bg-[#B22234] px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white"
          >
            Publicar artículos
          </Link>
          <Link
            href={HOME_PATH}
            className="border border-foreground/20 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest"
          >
            Inicio
          </Link>
        </div>
      </div>
    );
  }

  const groups = filterAdminNavForRole(getAdminNavGroups(), {
    isAdmin,
    isStaff: true,
  });

  const roleLabel = isAdmin ? "Administración" : "Staff editorial";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Editorial ribbon */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #B22234 0 10px, #ffffff 10px 20px)",
        }}
        aria-hidden
      />

      <header className="sticky top-0 z-40 border-b border-foreground bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-4">
            <Link href={HOME_PATH} className="font-display text-2xl tracking-tight hover:text-[#B22234]">
              Rheckypolitan
            </Link>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-[#B22234] sm:inline">
              {roleLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && <MaintenanceToggle />}
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-[10px] uppercase tracking-widest"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push(HOME_PATH);
              }}
            >
              Salir
            </Button>
          </div>
        </div>

        {/* Grouped IA nav */}
        <nav
          className="border-t border-foreground/10 bg-muted/25"
          aria-label="Navegación del panel"
        >
          <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-10 gap-y-4 px-6 py-3">
            {groups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                  {group.label}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {group.items.map((item) => (
                    <NavChip
                      key={item.id}
                      item={item}
                      active={isAdminNavItemActive(pathname, item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10 pb-16">{children}</main>
    </div>
  );
}

function NavChip({ item, active }: { item: AdminNavItem; active: boolean }) {
  const base =
    "inline-flex items-center px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition border";
  if (item.isAuthorSurface) {
    return (
      <Link
        href={item.href}
        className={
          active
            ? `${base} border-[#B22234] bg-[#B22234] text-white`
            : `${base} border-[#B22234]/40 text-[#B22234] hover:bg-[#B22234] hover:text-white`
        }
      >
        {item.label}
        <span className="ml-1 opacity-70" aria-hidden>
          ↗
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      className={
        active
          ? `${base} border-foreground bg-foreground text-background`
          : `${base} border-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground`
      }
    >
      {item.label}
    </Link>
  );
}
