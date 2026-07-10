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
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["redactors"],
    queryFn: () =>
      authFetch("/api/admin/users") as Promise<{
        users: { id: string; email: string; created_at: string }[];
      }>,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      toast.success("Redactor creado");
      setEmail("");
      setPassword("");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string, userEmail: string) => {
    if (!confirm(`¿Borrar al redactor ${userEmail}?`)) return;
    try {
      await authFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: id }),
      });
      toast.success("Eliminado");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  };

  return (
    <div className="space-y-10">
      <AdminPageHeader
        kicker="Equipo · Redactores"
        title="Redactores"
        description="Cuentas de staff con acceso al periódico y herramientas de equipo. No es el listado de autores de artículos."
      />

      <AdminPanel title="Alta de redactor">
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
          <Button type="submit" disabled={saving} className="font-mono text-[10px] uppercase tracking-widest">
            {saving ? "Creando…" : "Crear redactor"}
          </Button>
        </form>
      </AdminPanel>

      <div>
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
        ) : !data?.users.length ? (
          <AdminEmptyState
            title="Aún no hay redactores"
            description="Crea la primera cuenta de staff con el formulario de arriba."
          />
        ) : (
          <ul className="divide-y divide-foreground/15 border border-foreground/15">
            {data.users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 hover:bg-muted/30"
              >
                <div>
                  <p className="font-display text-lg">{u.email}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Alta {new Date(u.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => del(u.id, u.email)}>
                  Borrar
                </Button>
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
