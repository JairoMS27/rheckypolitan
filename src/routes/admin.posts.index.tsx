import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel } from "@/lib/sections";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/posts/")({
  component: () => (
    <AdminShell>
      <PostsAdmin />
    </AdminShell>
  ),
});

type Row = {
  id: string;
  section: string;
  slug: string;
  title: string;
  cover_path: string | null;
  published: boolean;
  published_at: string;
};

function PostsAdmin() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase
      .from("posts")
      .select("id,section,slug,title,cover_path,published,published_at")
      .order("published_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (r: Row) => {
    if (!confirm(`¿Borrar "${r.title}"?`)) return;
    // Remove cover folder
    const { data: files } = await supabase.storage.from("magazines").list(`posts/${r.id}`, { limit: 100 });
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
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Noticias
          </p>
          <h2 className="mt-1 font-display text-4xl">Publicaciones</h2>
        </div>
        <Link to="/admin/posts/new">
          <Button>+ Nueva noticia</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
            filter === "all" ? "border-foreground bg-foreground text-background" : "border-foreground/20"
          }`}
        >
          Todas
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
              filter === s.key ? "border-foreground bg-foreground text-background" : "border-foreground/20"
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
          <p className="font-display text-xl">Aún no hay noticias.</p>
          <p className="mt-2 text-sm text-muted-foreground">Crea la primera.</p>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
          {filtered.map((r) => (
            <li key={r.id} className="flex items-center gap-6 py-4">
              <div className="h-16 w-24 shrink-0 bg-muted">
                {r.cover_path && (
                  <img src={publicUrl(r.cover_path)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {sectionLabel(r.section)} · {new Date(r.published_at).toLocaleDateString("es-ES")}
                  {!r.published && <span className="ml-2 text-[#B22234]">· borrador</span>}
                </div>
                <div className="font-display text-xl">{r.title}</div>
              </div>
              <div className="flex gap-2">
                {r.published && (
                  <Link
                    to="/noticia/$section/$slug"
                    params={{ section: r.section, slug: r.slug }}
                  >
                    <Button variant="outline" size="sm">Ver</Button>
                  </Link>
                )}
                <Link to="/admin/posts/$id/edit" params={{ id: r.id }}>
                  <Button variant="outline" size="sm">Editar</Button>
                </Link>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => remove(r)}>
                    Borrar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
