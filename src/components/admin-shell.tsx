"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MaintenanceToggle } from "@/components/maintenance/maintenance-toggle";

export function AdminShell({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isAdmin, isRedactor, loading } = useAuth();
  const router = useRouter();

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
        <Link href="/admin/posts" className="text-xs uppercase tracking-widest underline">
          Ir a Noticias
        </Link>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">Acceso restringido</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta zona es solo para el equipo editorial.
        </p>
        <Link href="/" className="text-xs uppercase tracking-widest underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const roleLabel = isAdmin ? "Admin" : "Redactor";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <Link href="/" className="font-display text-xl">
              Rheckypolitan
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin" className="text-xs uppercase tracking-widest hover:underline">
                Revistas
              </Link>
            )}
            <Link href="/admin/posts" className="text-xs uppercase tracking-widest hover:underline">
              Noticias
            </Link>
            {isStaff && (
              <Link
                href="/admin/newspaper"
                className="text-xs uppercase tracking-widest hover:underline"
              >
                Periódico
              </Link>
            )}
            {isAdmin && (
              <>
                <MaintenanceToggle />
                <Link
                  href="/admin/users"
                  className="text-xs uppercase tracking-widest hover:underline"
                >
                  Redactores
                </Link>
                <Link
                  href="/admin/subscribers"
                  className="text-xs uppercase tracking-widest hover:underline"
                >
                  Suscriptores
                </Link>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-10">{children}</main>
    </div>
  );
}
