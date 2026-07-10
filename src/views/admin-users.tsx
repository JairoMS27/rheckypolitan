"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
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
    <div className="space-y-12">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Equipo
        </p>
        <h2 className="mt-1 font-display text-4xl">Redactores</h2>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 border border-foreground/15 p-6 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Email</Label>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Contraseña</Label>
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
        <Button type="submit" disabled={saving}>
          {saving ? "Creando…" : "Crear redactor"}
        </Button>
      </form>

      <div>
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
        ) : !data?.users.length ? (
          <div className="border border-dashed border-foreground/30 px-6 py-16 text-center">
            <p className="font-display text-xl">Aún no hay redactores.</p>
          </div>
        ) : (
          <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
            {data.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-4">
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
