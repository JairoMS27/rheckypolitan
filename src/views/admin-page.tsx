"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-page-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/storage";
import { authorPostsListPath } from "@/lib/dashboard-paths";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

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
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: `¿Borrar el N.º ${issue.number}?`,
      description: "Se eliminarán también todas sus páginas. Esta acción no se puede deshacer.",
      confirmLabel: "Borrar revista",
      tone: "danger",
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: `¿Avisar del Nº${issue.number}?`,
      description:
        "Se enviará un correo a todos los suscriptores. Esta acción no se puede deshacer.",
      confirmLabel: "Enviar aviso",
    });
    if (!ok) return;
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
      <AdminPageHeader
        kicker="Revistas · Archivo"
        title="Números de la revista"
        description={
          <>
            Aquí gestionas las <strong className="font-medium text-foreground">revistas digitales</strong>{" "}
            (números con portada y páginas). Los{" "}
            <strong className="font-medium text-foreground">artículos de todos los autores</strong> están en{" "}
            <Link
              href="/admin/posts"
              className="text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
            >
              Artículos
            </Link>
            ; cada autor gestiona los suyos en{" "}
            <Link
              href={authorPostsListPath()}
              className="text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
            >
              Mis artículos
            </Link>
            .
          </>
        }
        actions={
          <Link href="/admin/new">
            <Button className="font-mono text-[10px] uppercase tracking-widest">
              + Nueva revista
            </Button>
          </Link>
        }
      />

      {issues === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : issues.length === 0 ? (
        <AdminEmptyState
          title="Aún no hay revistas"
          description="Publica el primer número del archivo digital."
          action={
            <Link href="/admin/new">
              <Button>+ Nueva revista</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-foreground/15 border border-foreground/15">
          {issues.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-6 px-4 py-5 transition hover:bg-muted/30"
            >
              <div className="h-24 w-16 shrink-0 border border-foreground/10 bg-muted">
                {i.cover_path && (
                  <img
                    src={publicUrl(i.cover_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B22234]">
                  N.º {String(i.number).padStart(2, "0")} · {i.page_count} páginas ·{" "}
                  {new Date(i.published_at).toLocaleDateString("es-ES")}
                </div>
                <div className="mt-1 font-display text-2xl leading-tight">{i.title}</div>
              </div>
              <div className="flex flex-wrap gap-2">
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
