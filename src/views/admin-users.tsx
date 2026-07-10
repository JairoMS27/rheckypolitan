"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { RegisteredUser } from "@/lib/admin-users.functions";
import { RedactorBadge } from "@/components/redactor-badge";
import { useConfirm } from "@/components/confirm-dialog";

async function authFetch(url: string, init?: RequestInit) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Sesión expirada");
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data;
}

function UsersAdmin() {
  const confirm = useConfirm();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["registered-users"],
    queryFn: () =>
      authFetch("/api/admin/users") as Promise<{ users: RegisteredUser[] }>,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      toast.success("Usuario registrado");
      setEmail("");
      setPassword("");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const promote = async (u: RegisteredUser) => {
    const ok = await confirm({
      title: `¿Ascender a redactor a ${u.email}?`,
      description: "Podrá publicar artículos y acceder a herramientas de redacción.",
      confirmLabel: "Ascender",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "promote", userId: u.id }),
      });
      toast.success("Ascendido a redactor");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  };

  const demote = async (u: RegisteredUser) => {
    const ok = await confirm({
      title: `¿Quitar rol de redactor a ${u.email}?`,
      description: "Perderá privilegios de redacción, no la cuenta.",
      confirmLabel: "Quitar rol",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "demote", userId: u.id }),
      });
      toast.success("Rol de redactor retirado");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  };

  const del = async (u: RegisteredUser) => {
    if (u.isAdmin) {
      toast.error("No se pueden eliminar admins");
      return;
    }
    const ok = await confirm({
      title: `¿Eliminar la cuenta ${u.email}?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar cuenta",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await authFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: u.id }),
      });
      toast.success("Usuario eliminado");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  };

  const users = data?.users ?? [];
  const q = filter.trim().toLowerCase();
  const visible = q
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.display_name ?? "").toLowerCase().includes(q),
      )
    : users;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        kicker="Equipo · Usuarios"
        title="Usuarios registrados"
        description="Listado de cuentas (sin edición de datos). Puedes registrar, eliminar o ascender a redactor. Los redactores publican artículos e imágenes; las revistas siguen solo para admin."
        actions={
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar…"
            className="w-56 border border-foreground/20 bg-transparent px-3 py-2 font-mono text-xs focus:border-[#B22234] focus:outline-none"
          />
        }
      />

      <AdminPanel title="Registrar cuenta">
        <form
          onSubmit={submit}
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest">Email</Label>
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest">Contraseña</Label>
            <Input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
              placeholder="mínimo 10 caracteres"
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            {saving ? "Creando…" : "Registrar"}
          </Button>
        </form>
      </AdminPanel>

      <div>
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
        ) : visible.length === 0 ? (
          <AdminEmptyState
            title={users.length ? "Sin coincidencias" : "Aún no hay usuarios"}
            description={
              users.length
                ? "Prueba otra búsqueda."
                : "Registra la primera cuenta o espera a que alguien se registre."
            }
          />
        ) : (
          <ul className="divide-y divide-foreground/15 border border-foreground/15">
            {visible.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg">{u.display_name || u.email}</p>
                    {u.isAdmin && (
                      <span className="border border-foreground px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest">
                        Admin
                      </span>
                    )}
                    {u.isRedactor && !u.isAdmin && <RedactorBadge className="ml-0" />}
                    {!u.isAdmin && !u.isRedactor && (
                      <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                        Usuario
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {u.email}
                    {" · "}
                    Alta {new Date(u.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!u.isAdmin && !u.isRedactor && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => promote(u)}
                      className="border-[#B22234] text-[#B22234] hover:bg-[#B22234] hover:text-white"
                    >
                      Ascender a redactor
                    </Button>
                  )}
                  {u.isRedactor && !u.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => demote(u)}
                    >
                      Quitar redactor
                    </Button>
                  )}
                  {!u.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => del(u)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  return (
    <AdminShell adminOnly>
      <UsersAdmin />
    </AdminShell>
  );
}
