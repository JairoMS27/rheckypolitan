"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthorShell } from "@/components/author-shell";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel } from "@/lib/sections";
import {
  authorPostEditPath,
  authorPostNewPath,
} from "@/lib/dashboard-paths";
import {
  deleteAuthorPost,
  fetchAuthorPosts,
  type AuthorPostRow,
} from "@/lib/author-api";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

function PostsList() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<AuthorPostRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    try {
      const { posts } = await fetchAuthorPosts();
      setRows(posts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar";
      toast.error(message);
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (r: AuthorPostRow) => {
    const ok = await confirm({
      title: `¿Borrar «${r.title}»?`,
      description: "El artículo y sus imágenes se eliminarán de forma permanente.",
      confirmLabel: "Borrar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteAuthorPost(r.id);
      toast.success("Eliminado");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo borrar");
    }
  };

  const filtered = (rows ?? []).filter((r) => filter === "all" || r.section === filter);

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Tu espacio
          </p>
          <h1 className="mt-1 font-display text-4xl">Mis artículos</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Aquí están todos tus artículos: borradores y publicados. Crea, edita o elimina solo
            lo tuyo — nadie más verá este listado.
          </p>
        </div>
        <Link href={authorPostNewPath()}>
          <Button>+ Nuevo artículo</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
            filter === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/20"
          }`}
        >
          Todas
        </button>
        {SECTIONS.map((s) => (
          <button
            type="button"
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
              filter === s.key
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/20"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
          <p className="font-display text-xl">Todavía no has publicado nada.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando escribas tu primer artículo, aparecerá aquí listo para editar.
          </p>
          <Link href={authorPostNewPath()} className="mt-6 inline-block">
            <Button>Escribir mi primer artículo</Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
          {filtered.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-6 py-4">
              <div className="h-16 w-24 shrink-0 bg-muted">
                {r.cover_path && (
                  <img
                    src={publicUrl(r.cover_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {sectionLabel(r.section)} · {new Date(r.published_at).toLocaleDateString("es-ES")}
                  {!r.published && <span className="ml-2 text-[#B22234]">· borrador</span>}
                </div>
                <div className="font-display text-xl">{r.title}</div>
              </div>
              <div className="flex gap-2">
                {r.published && (
                  <Link href={`/noticia/${r.section}/${r.slug}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                )}
                <Link href={authorPostEditPath(r.id)}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => remove(r)}>
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

export function AuthorPostsPage() {
  return (
    <AuthorShell>
      <PostsList />
    </AuthorShell>
  );
}
