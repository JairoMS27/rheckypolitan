"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";
import { profilePath } from "@/lib/username";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  if (diff < 2592000) {
    const d = Math.floor(diff / 86400);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function CommentsSection({ postId }: { postId: string }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    const { data: rows } = await supabase
      .from("comments")
      .select("id, content, created_at, updated_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const list = rows ?? [];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    let profilesMap: Record<
      string,
      { display_name: string; avatar_url: string | null; username: string | null }
    > = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", ids);
      profilesMap = Object.fromEntries(
        (profs ?? []).map((p) => [
          p.id,
          {
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            username: p.username,
          },
        ]),
      );
    }
    setComments(
      list.map((r) => ({ ...r, profiles: profilesMap[r.user_id] ?? null })),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      });
      if (error) throw error;
      setContent("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al publicar", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      setEditingId(null);
      setEditContent("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al editar", { description: message });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      toast.success("Comentario eliminado");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al eliminar", { description: message });
    }
  };

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  return (
    <section className="mt-16 border-t border-foreground/20 pt-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ Conversación
          </span>
          <h2 className="mt-1 font-display text-2xl leading-tight">
            {comments.length === 0
              ? "Comentarios"
              : `${comments.length} ${comments.length === 1 ? "comentario" : "comentarios"}`}
          </h2>
        </div>
      </div>

      {!authLoading && (
        <div className="mb-10">
          {user ? (
            <form onSubmit={handleSubmit}>
              <div className="border border-foreground/15 transition-colors focus-within:border-foreground/40">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder="Escribe un comentario…"
                  rows={3}
                  className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground/30 focus:outline-none"
                />
                <div className="flex items-center justify-between border-t border-foreground/10 px-4 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Markdown no soportado
                  </span>
                  <button
                    type="submit"
                    disabled={!content.trim() || submitting}
                    className="border border-foreground bg-foreground px-5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-40"
                  >
                    {submitting ? "Publicando…" : "Comentar"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="border border-dashed border-foreground/20 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
                >
                  Inicia sesión
                </Link>{" "}
                o{" "}
                <Link
                  href={`/auth/register?redirect=${encodeURIComponent(pathname)}`}
                  className="font-medium text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
                >
                  regístrate
                </Link>{" "}
                para dejar un comentario.
              </p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse bg-muted" />
                <div className="h-4 w-3/4 animate-pulse bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="border border-dashed border-foreground/15 px-6 py-12 text-center">
          <p className="font-display text-lg text-foreground/60">Sé el primero en comentar.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte tu opinión sobre este artículo.
          </p>
        </div>
      ) : (
        <ul className="space-y-0 divide-y divide-foreground/10">
          {comments.map((comment) => {
            const displayName = comment.profiles?.display_name ?? "Lector";
            const username = comment.profiles?.username ?? null;
            const avatarUrl = comment.profiles?.avatar_url ?? null;
            const isOwner = user?.id === comment.user_id;
            const isEdited = comment.updated_at !== comment.created_at;
            const href = profilePath(username);

            return (
              <li key={comment.id} className="py-5 first:pt-0">
                <div className="flex gap-3">
                  <UserAvatar
                    displayName={displayName}
                    username={username}
                    avatarUrl={avatarUrl}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {href ? (
                        <Link
                          href={href}
                          className="font-mono text-[11px] font-medium text-foreground hover:text-[#B22234]"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <span className="font-mono text-[11px] font-medium text-foreground">
                          {displayName}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {timeAgo(comment.created_at)}
                      </span>
                      {isEdited && (
                        <span className="font-mono text-[9px] italic text-muted-foreground">
                          (editado)
                        </span>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => {
                            setEditContent(e.target.value);
                            autoResize(e.target);
                          }}
                          className="w-full resize-none border border-foreground/20 bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground focus:border-[#B22234] focus:outline-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleEdit(comment.id)}
                            disabled={!editContent.trim()}
                            className="border border-foreground bg-foreground px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-40"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent("");
                            }}
                            className="px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                        {comment.content}
                      </p>
                    )}

                    {isOwner && editingId !== comment.id && (
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
