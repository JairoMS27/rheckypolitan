"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthorShell } from "@/components/author-shell";
import { PostForm, type PostInput } from "@/components/post-form";
import { supabase } from "@/integrations/supabase/client";
import type { SectionKey } from "@/lib/sections";
import { authorPostsListPath } from "@/lib/dashboard-paths";

function EditPost() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<PostInput | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (!row) {
        setMissing(true);
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
  }, [id]);

  if (missing) return <p className="font-mono text-xs">Artículo no encontrado.</p>;
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