"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel } from "@/lib/sections";
import {
  authorPostEditPath,
  authorPostNewPath,
  authorPostsListPath,
} from "@/lib/dashboard-paths";
import {
  deleteAuthorPost,
  fetchAllPostsForAdmin,
  type AuthorPostRow,
} from "@/lib/author-api";
import { toast } from "sonner";
import { profilePath } from "@/lib/username";

function authorLabel(r: AuthorPostRow): string {
  return (
    r.author_display_name?.trim() ||
    r.author?.trim() ||
    r.author_username?.trim() ||
    "Sin autor"
  );
}

function PostsAdmin() {
  const [rows, setRows] = useState<AuthorPostRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const load = async () => {
    try {
      const { posts } = await fetchAllPostsForAdmin();
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
    if (!confirm(`¿Borrar "${r.title}"?`)) return;
    try {
      await deleteAuthorPost(r.id);
      toast.success("Eliminado");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo borrar");
    }
  };

  const authors = (() => {
    const map = new Map<string, string>();
    for (const r of rows ?? []) {
      const key = r.author_id ?? r.author_username ?? authorLabel(r);
      if (!map.has(key)) map.set(key, authorLabel(r));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  })();

  const filtered = (rows ?? []).filter((r) => {
    if (filter !== "all" && r.section !== filter) return false;
    if (authorFilter !== "all") {
      const key = r.author_id ?? r.author_username ?? authorLabel(r);
      if (key !== authorFilter) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Escritura · Catálogo
          </p>
          <h2 className="mt-1 font-display text-4xl">Artículos de la redacción</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Vista de administración: todos los artículos de cada autor. Para gestionar solo los
            tuyos, usa{" "}
            <Link href={authorPostsListPath()} className="underline underline-offset-2 hover:text-[#B22234]">
              Mis artículos
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={authorPostsListPath()}>
            <Button variant="outline">Mis artículos</Button>
          </Link>
          <Link href={authorPostNewPath()}>
            <Button>+ Nuevo artículo</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
            filter === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/20"
          }`}
        >
          Todas las secciones
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

      {authors.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAuthorFilter("all")}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
              authorFilter === "all"
                ? "border-[#B22234] bg-[#B22234] text-white"
                : "border-foreground/20"
            }`}
          >
            Todos los autores
          </button>
          {authors.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setAuthorFilter(key)}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
                authorFilter === key
                  ? "border-[#B22234] bg-[#B22234] text-white"
                  : "border-foreground/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {rows === null ? (
        <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
          <p className="font-display text-xl">Aún no hay artículos.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando la redacción publique, aparecerán aquí agrupados por autor.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
          {filtered.map((r) => {
            const name = authorLabel(r);
            const href = profilePath(r.author_username);
            return (
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
                    {sectionLabel(r.section)} ·{" "}
                    {new Date(r.published_at).toLocaleDateString("es-ES")}
                    {!r.published && (
                      <span className="ml-2 text-[#B22234]">· borrador</span>
                    )}
                  </div>
                  <div className="font-display text-xl">{r.title}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    Por{" "}
                    {href ? (
                      <Link href={href} className="underline-offset-2 hover:underline hover:text-[#B22234]">
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                    {r.author_username && (
                      <span className="font-mono text-[10px] text-muted-foreground/80">
                        {" "}
                        · @{r.author_username}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminPostsPage() {
  return (
    <AdminShell adminOnly>
      <PostsAdmin />
    </AdminShell>
  );
}
