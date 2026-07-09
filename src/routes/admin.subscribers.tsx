import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscribers")({
  component: () => (
    <AdminShell adminOnly>
      <Inner />
    </AdminShell>
  ),
});

type Subscriber = {
  id: string;
  email: string;
  created_at: string;
};

function Inner() {
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
    if (!confirm(`¿Eliminar a ${s.email} de la newsletter?`)) return;
    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Eliminado");
    setSubs((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
  };

  const visible = subs
    ? subs.filter((s) =>
        s.email.toLowerCase().includes(filter.trim().toLowerCase()),
      )
    : null;

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Newsletter
          </p>
          <h2 className="mt-1 font-display text-4xl">Suscriptores</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {subs ? `${subs.length} en total` : "Cargando…"}
          </p>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar correo…"
          className="w-64 border border-foreground/20 bg-transparent px-3 py-2 font-mono text-xs focus:border-foreground focus:outline-none"
        />
      </div>

      {visible === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
          <p className="font-display text-xl">
            {subs && subs.length > 0
              ? "Ningún correo coincide con la búsqueda."
              : "Aún no hay suscriptores."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
          {visible.map((s) => (
            <li key={s.id} className="flex items-center gap-6 py-3">
              <div className="flex-1">
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
