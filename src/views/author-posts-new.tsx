"use client";

import { AuthorShell } from "@/components/author-shell";
import { PostForm } from "@/components/post-form";
import { authorPostsListPath } from "@/lib/dashboard-paths";

export function AuthorPostsNewPage() {
  return (
    <AuthorShell>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Nuevo artículo
        </p>
        <h1 className="mt-1 mb-2 font-display text-4xl">Publicar artículo</h1>
        <p className="mb-10 max-w-xl text-sm text-muted-foreground">
          Los artículos aparecen en las secciones del archivo. Las revistas (números) las gestiona
          solo el equipo editorial en el panel admin.
        </p>
        <PostForm
          returnTo={authorPostsListPath()}
          initial={{
            section: "actualidad",
            slug: "",
            title: "",
            excerpt: "",
            cover_path: null,
            cover_position: "50% 50%",
            content_html: "",
            author: "",
            published: true,
            published_at: new Date().toISOString().slice(0, 10),
          }}
        />
      </div>
    </AuthorShell>
  );
}