"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-page-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

type Subscriber = {
  id: string;
  email: string;
  created_at: string;
};

function Inner() {
  const confirm = useConfirm();
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("id,email,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setSubs([]);
      return;
    }
    setSubs(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (s: Subscriber) => {
    const ok = await confirm({
      title: `¿Eliminar a ${s.email}?`,
      description: "Dejará de recibir la newsletter.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Eliminado");
    setSubs((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
  };

  const visible = subs
    ? subs.filter((s) => s.email.toLowerCase().includes(filter.trim().toLowerCase()))
    : null;

  return (
    <div>
      <AdminPageHeader
        kicker="Sitio · Newsletter"
        title="Suscriptores"
        description={
          subs
            ? `${subs.length} lectora${subs.length === 1 ? "" : "s"} en Cartas desde Kentucky.`
            : "Cargando listado…"
        }
        actions={
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar correo…"
            className="w-64 border border-foreground/20 bg-transparent px-3 py-2 font-mono text-xs focus:border-[#B22234] focus:outline-none"
          />
        }
      />

      {visible === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : visible.length === 0 ? (
        <AdminEmptyState
          title={
            subs && subs.length > 0
              ? "Ningún correo coincide"
              : "Aún no hay suscriptores"
          }
          description={
            subs && subs.length > 0
              ? "Prueba otra búsqueda."
              : "Las altas llegan desde el formulario del archivo público."
          }
        />
      ) : (
        <ul className="divide-y divide-foreground/15 border border-foreground/15">
          {visible.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-6 px-4 py-3 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">{s.email}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Suscrita/o el{" "}
                  {new Date(s.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => remove(s)}>
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminSubscribersPage() {
  return (
    <AdminShell adminOnly>
      <Inner />
    </AdminShell>
  );
}
