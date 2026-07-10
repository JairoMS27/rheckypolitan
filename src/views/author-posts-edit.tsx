"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthorShell } from "@/components/author-shell";
import { PostForm, type PostInput } from "@/components/post-form";
import { supabase } from "@/integrations/supabase/client";
import type { SectionKey } from "@/lib/sections";
import { authorPostsListPath } from "@/lib/dashboard-paths";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

function EditPost() {
  const { id } = useParams() as { id: string };
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<PostInput | null>(null);
  const [missing, setMissing] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: row } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (!row) {
        setMissing(true);
        return;
      }
      // Only the author (or admin moderating) may edit.
      if (!isAdmin && row.author_id && row.author_id !== user.id) {
        setForbidden(true);
        return;
      }
      setData({
        id: row.id,
        section: row.section as SectionKey,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? "",
        cover_path: row.cover_path,
        cover_position: (row as { cover_position?: string }).cover_position ?? "50% 50%",
        content_html: row.content_html,
        author: row.author ?? "",
        published: row.published,
        published_at: (row.published_at ?? "").slice(0, 10),
        author_id: row.author_id,
      });
    })();
  }, [id, user, isAdmin, authLoading]);

  if (authLoading) {
    return <p className="font-mono text-xs text-muted-foreground">Cargando…</p>;
  }
  if (missing) return <p className="font-mono text-xs">Artículo no encontrado.</p>;
  if (forbidden) {
    return (
      <div className="space-y-3">
        <p className="font-display text-2xl">No puedes editar este artículo</p>
        <p className="text-sm text-muted-foreground">
          Solo el autor puede modificar sus textos. Vuelve a tus propios artículos.
        </p>
        <Link
          href={authorPostsListPath()}
          className="inline-block font-mono text-[10px] uppercase tracking-widest text-[#B22234] underline underline-offset-2"
        >
          Ir a mis artículos
        </Link>
      </div>
    );
  }
  if (!data) return <p className="font-mono text-xs text-muted-foreground">Cargando…</p>;

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Editar artículo
      </p>
      <h1 className="mt-1 mb-10 font-display text-4xl">{data.title || "Artículo"}</h1>
      <PostForm initial={data} returnTo={authorPostsListPath()} />
    </div>
  );
}

export function AuthorPostsEditPage() {
  return (
    <AuthorShell>
      <EditPost />
    </AuthorShell>
  );
}
