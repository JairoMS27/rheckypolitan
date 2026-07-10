"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthorShell } from "@/components/author-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel } from "@/lib/sections";
import { useAuth } from "@/hooks/use-auth";
import {
  authorPostEditPath,
  authorPostNewPath,
  authorPostsListPath,
} from "@/lib/dashboard-paths";
import { toast } from "sonner";

type Row = {
  id: string;
  section: string;
  slug: string;
  title: string;
  cover_path: string | null;
  published: boolean;
  published_at: string;
  author_id: string | null;
};

function PostsList() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    let q = supabase
      .from("posts")
      .select("id,section,slug,title,cover_path,published,published_at,author_id")
      .order("published_at", { ascending: false });
    if (!isAdmin && user?.id) {
      q = q.eq("author_id", user.id);
    }
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  const remove = async (r: Row) => {
    if (!confirm(`¿Borrar "${r.title}"?`)) return;
    const { data: files } = await supabase.storage
      .from("magazines")
      .list(`posts/${r.id}`, { limit: 100 });
    if (files?.length) {
      await supabase.storage.from("magazines").remove(files.map((f) => `posts/${r.id}/${f.name}`));
    }
    const { error } = await supabase.from("posts").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminado");
      load();
    }
  };

  const filtered = (rows ?? []).filter((r) => filter === "all" || r.section === filter);

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Artículos
          </p>
          <h1 className="mt-1 font-display text-4xl">
            {isAdmin ? "Todos los artículos" : "Mis artículos"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Aquí publicas y editas artículos del archivo. Las revistas digitales se gestionan
            solo desde el panel de administración.
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
          <p className="font-display text-xl">Aún no hay artículos.</p>
          <p className="mt-2 text-sm text-muted-foreground">Escribe el primero desde aquí.</p>
          <Link href={authorPostNewPath()} className="mt-6 inline-block">
            <Button>Publicar artículo</Button>
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
                {(isAdmin || r.author_id === user?.id) && (
                  <Button variant="outline" size="sm" onClick={() => remove(r)}>
                    Borrar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Ruta autor: {authorPostsListPath()} · no es el panel de revistas
      </p>
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