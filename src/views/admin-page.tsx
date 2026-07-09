"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/storage";
import { toast } from "sonner";

type Issue = {
  id: string;
  number: number;
  title: string;
  published_at: string;
  cover_path: string | null;
  page_count: number;
};

function AdminIndex() {
  return (
    <AdminShell adminOnly>
      <Inner />
    </AdminShell>
  );
}

function Inner() {
  const [issues, setIssues] = useState<Issue[] | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("issues")
      .select("id,number,title,published_at,cover_path,page_count")
      .order("number", { ascending: false });
    setIssues(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (issue: Issue) => {
    if (!confirm(`¿Borrar el N.º ${issue.number}? Se eliminarán también todas sus páginas.`))
      return;
    // delete storage folder
    const { data: files } = await supabase.storage
      .from("magazines")
      .list(issue.id, { limit: 1000 });
    const { data: pageFiles } = await supabase.storage
      .from("magazines")
      .list(`${issue.id}/pages`, { limit: 1000 });
    const paths: string[] = [
      ...(files?.map((f) => `${issue.id}/${f.name}`) ?? []),
      ...(pageFiles?.map((f) => `${issue.id}/pages/${f.name}`) ?? []),
    ];
    if (paths.length) await supabase.storage.from("magazines").remove(paths);
    const { error } = await supabase.from("issues").delete().eq("id", issue.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminado");
      load();
    }
  };

  const notify = async (issue: Issue) => {
    if (
      !confirm(
        `¿Enviar aviso del Nº${issue.number} a todos los suscriptores? Esta acción no se puede deshacer.`,
      )
    )
      return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      toast.error("Sesión expirada");
      return;
    }
    const t = toast.loading("Enviando…");
    try {
      const res = await fetch("/api/admin/notify-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(
        `Enviado a ${data.sent}/${data.total}${data.failed ? ` · ${data.failed} fallaron` : ""}`,
        { id: t },
      );
    } catch (e: any) {
      toast.error(e.message || "Error al enviar", { id: t });
    }
  };

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Revistas
          </p>
          <h2 className="mt-1 font-display text-4xl">Archivo</h2>
        </div>
        <Link href="/admin/new">
          <Button>+ Nueva revista</Button>
        </Link>
      </div>

      {issues === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : issues.length === 0 ? (
        <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
          <p className="font-display text-xl">Aún no hay revistas.</p>
          <p className="mt-2 text-sm text-muted-foreground">Crea el primer número.</p>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
          {issues.map((i) => (
            <li key={i.id} className="flex items-center gap-6 py-4">
              <div className="h-20 w-16 shrink-0 bg-muted">
                {i.cover_path && (
                  <img
                    src={publicUrl(i.cover_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  N.º {String(i.number).padStart(2, "0")} · {i.page_count} páginas
                </div>
                <div className="font-display text-xl">{i.title}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/revista/${i.number}`}>
                  <Button variant="outline" size="sm">
                    Ver
                  </Button>
                </Link>
                <Link href={`/admin/${i.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => notify(i)}>
                  Avisar
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(i)}>
                  Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminPage() {
  return (
    <AdminShell adminOnly>
      <Inner />
    </AdminShell>
  );
}
