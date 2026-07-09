import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { PostForm } from "@/components/post-form";

export const Route = createFileRoute("/admin/posts/new")({
  component: () => (
    <AdminShell>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Nueva
        </p>
        <h2 className="mt-1 mb-10 font-display text-4xl">Crear noticia</h2>
        <PostForm
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
    </AdminShell>
  ),
});
