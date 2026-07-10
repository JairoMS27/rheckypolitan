import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel, type SectionKey } from "@/lib/sections";
import { UserMenu } from "@/components/user-menu";
import { CommentsSection } from "@/components/comments-section";
import { sanitizeHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/noticia/$section/$slug")({
  component: PostPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="font-display text-3xl">Noticia no encontrada</p>
        <Link to="/" className="mt-4 inline-block font-mono text-xs uppercase tracking-widest underline">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-sm text-destructive">{error.message}</div>
  ),
});

type Post = {
  id: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  cover_position: string | null;
  content_html: string;
  author: string | null;
  published_at: string;
};

function PostPage() {
  const { section, slug } = useParams({ from: "/noticia/$section/$slug" });
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("section", section)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setPost((data as Post | null) ?? null);
    })();
  }, [section, slug]);

  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (post === null) {
    throw notFound();
  }

  const label = sectionLabel(section);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)" }}
        aria-hidden
      />
      <header className="border-b border-foreground">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 items-center px-6 py-5">
          <Link
            to={`/${section}` as any}
            className="justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
          >
            ← {label}
          </Link>
          <Link
            to="/"
            className="justify-self-center font-display text-2xl font-semibold tracking-tight md:text-3xl"
          >
            Rheckypolitan
          </Link>
          <div className="justify-self-end">
            <UserMenu />
          </div>
        </div>
        <nav className="border-t border-foreground/10">
          <ul className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-6 px-6 py-3 md:gap-10">
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <Link
                  to={s.path}
                  className={`font-mono text-[10px] uppercase tracking-widest hover:text-[#B22234] ${
                    s.key === section ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-16 md:py-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ {label}
        </span>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,4rem)] font-normal leading-[1] tracking-tight">
          {post.title}
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {new Date(post.published_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          {post.author && <> · {post.author}</>}
        </p>
        {post.cover_path && (
          <div className="mt-10 aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={publicUrl(post.cover_path)}
              alt={post.title}
              className="h-full w-full object-cover"
              style={{ objectPosition: post.cover_position ?? "50% 50%" }}
            />
          </div>
        )}
        {post.excerpt && (
          <p className="mt-10 border-l-2 border-[#B22234] pl-4 font-display text-xl leading-snug text-foreground/85">
            {post.excerpt}
          </p>
        )}
        <article
          className="post-content mt-10 text-[17px] leading-[1.7]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }}
        />
        <style>{`
          .post-content p { margin: 1em 0; }
          .post-content h1 { font-family: var(--font-display, serif); font-size: 2.25rem; margin: 1.5em 0 0.5em; line-height: 1.1; }
          .post-content h2 { font-family: var(--font-display, serif); font-size: 1.75rem; margin: 1.4em 0 0.5em; line-height: 1.15; }
          .post-content h3 { font-family: var(--font-display, serif); font-size: 1.35rem; margin: 1.3em 0 0.5em; line-height: 1.2; }
          .post-content ul, .post-content ol { padding-left: 1.5rem; margin: 1em 0; }
          .post-content ul { list-style: disc; }
          .post-content ol { list-style: decimal; }
          .post-content li { margin: 0.3em 0; }
          .post-content blockquote { border-left: 3px solid #B22234; padding: 0.2em 0 0.2em 1rem; margin: 1.4em 0; font-style: italic; color: hsl(var(--muted-foreground)); }
          .post-content a { color: #B22234; text-decoration: underline; }
          .post-content img { max-width: 100%; height: auto; margin: 1.5em 0; }
          .post-content iframe { width: 100%; aspect-ratio: 16/9; height: auto; margin: 1.5em 0; }
          .post-content hr { border: 0; border-top: 1px solid hsl(var(--border)); margin: 2em 0; }
          .post-content strong { font-weight: 600; }
        `}</style>

        <CommentsSection postId={post.id} />

        <div className="mt-16 border-t border-foreground/20 pt-6">
          <Link
            to={`/${section}` as any}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
          >
            ← Volver a {label}
          </Link>
        </div>
      </main>

      <footer className="border-t border-foreground">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-3 px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>★</span>
          <span>© {new Date().getFullYear()} Rheckypolitan</span>
          <span>★</span>
        </div>
      </footer>
    </div>
  );
}
