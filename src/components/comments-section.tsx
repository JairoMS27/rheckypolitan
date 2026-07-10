"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";
import { EmojiPicker } from "@/components/emoji-picker";
import { useConfirm } from "@/components/confirm-dialog";
import { profilePath } from "@/lib/username";

type ProfileBits = {
  display_name: string;
  avatar_url: string | null;
  username: string | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: ProfileBits | null;
  likeCount: number;
  likedByMe: boolean;
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

function Composer({
  placeholder,
  onSubmit,
  submitting,
  autoFocus,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (text: string) => Promise<void>;
  submitting: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const insertEmoji = (emoji: string) => {
    const el = taRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      autoResize(el);
    });
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || submitting) return;
        const value = text.trim();
        setText("");
        setShowEmoji(false);
        if (taRef.current) taRef.current.style.height = "auto";
        await onSubmit(value);
      }}
    >
      <div className="border border-foreground/15 bg-background transition-colors focus-within:border-foreground/40">
        <textarea
          ref={taRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            setText(e.target.value);
            autoResize(e.target);
          }}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground/30 focus:outline-none"
        />
        <div className="relative flex items-center justify-between gap-2 border-t border-foreground/10 px-3 py-2">
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded transition ${
                showEmoji
                  ? "bg-muted text-[#B22234]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title="Emojis"
              aria-label="Abrir selector de emojis"
              aria-expanded={showEmoji}
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            <EmojiPicker
              open={showEmoji}
              onClose={() => setShowEmoji(false)}
              onPick={(emoji) => insertEmoji(emoji)}
            />
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="border border-foreground bg-foreground px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-40"
            >
              {submitting ? "…" : "Publicar"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentCard({
  comment,
  depth,
  userId,
  onReply,
  onLike,
  onDelete,
  onEdit,
  children,
}: {
  comment: CommentRow;
  depth: number;
  userId?: string;
  onReply: (parentId: string) => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const displayName = comment.profiles?.display_name ?? "Lector";
  const username = comment.profiles?.username ?? null;
  const avatarUrl = comment.profiles?.avatar_url ?? null;
  const isOwner = userId === comment.user_id;
  const isEdited = comment.updated_at !== comment.created_at;
  const href = profilePath(username);

  return (
    <li className={depth > 0 ? "mt-4 border-l border-foreground/10 pl-4" : ""}>
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
              <span className="font-mono text-[11px] font-medium">{displayName}</span>
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

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full resize-none border border-foreground/20 bg-transparent px-3 py-2 text-sm focus:border-[#B22234] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!editText.trim()}
                  onClick={async () => {
                    await onEdit(comment.id, editText.trim());
                    setEditing(false);
                  }}
                  className="border border-foreground bg-foreground px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-background"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditText(comment.content);
                  }}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {comment.content}
            </p>
          )}

          {!editing && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onLike(comment.id)}
                className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest transition ${
                  comment.likedByMe
                    ? "text-[#B22234]"
                    : "text-muted-foreground hover:text-[#B22234]"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${comment.likedByMe ? "fill-current" : ""}`}
                />
                {comment.likeCount > 0 ? comment.likeCount : "Me gusta"}
              </button>
              {depth < 3 && userId && (
                <button
                  type="button"
                  onClick={() => onReply(comment.id)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Responder
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setEditText(comment.content);
                    }}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </li>
  );
}

export function CommentsSection({ postId }: { postId: string }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("comments")
      .select("id, content, created_at, updated_at, user_id, parent_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[comments]", error.message);
      setLoading(false);
      return;
    }

    const list = rows ?? [];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const commentIds = list.map((r) => r.id);

    let profilesMap: Record<string, ProfileBits> = {};
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

    const likeCount = new Map<string, number>();
    const likedByMe = new Set<string>();
    if (commentIds.length) {
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      for (const like of likes ?? []) {
        likeCount.set(like.comment_id, (likeCount.get(like.comment_id) ?? 0) + 1);
        if (user?.id && like.user_id === user.id) likedByMe.add(like.comment_id);
      }
    }

    setComments(
      list.map((r) => ({
        ...r,
        parent_id: (r as { parent_id?: string | null }).parent_id ?? null,
        profiles: profilesMap[r.user_id] ?? null,
        likeCount: likeCount.get(r.id) ?? 0,
        likedByMe: likedByMe.has(r.id),
      })),
    );
    setLoading(false);
  }, [postId, user?.id]);

  useEffect(() => {
    void fetchComments();

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
          void fetchComments();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => {
          void fetchComments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const tree = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const byParent = new Map<string, CommentRow[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const arr = byParent.get(c.parent_id) ?? [];
      arr.push(c);
      byParent.set(c.parent_id, arr);
    }
    return { roots, byParent };
  }, [comments]);

  const postComment = async (content: string, parentId: string | null) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId,
      });
      if (error) throw error;
      setReplyTo(null);
      // Always refresh so the new comment appears even if Realtime lags
      await fetchComments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al publicar", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Inicia sesión para dar me gusta");
      return;
    }
    const current = comments.find((c) => c.id === commentId);
    if (!current) return;

    // Optimistic
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likedByMe: !c.likedByMe,
              likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1,
            }
          : c,
      ),
    );

    try {
      if (current.likedByMe) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      await fetchComments();
      const message = err instanceof Error ? err.message : "Error";
      toast.error("No se pudo actualizar el me gusta", { description: message });
    }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirm({
      title: "¿Eliminar este comentario?",
      description: "Se borrará de forma permanente, incluidas las respuestas anidadas.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      toast.success("Comentario eliminado");
      await fetchComments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al eliminar", { description: message });
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      await fetchComments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo.";
      toast.error("Error al editar", { description: message });
    }
  };

  const renderThread = (nodes: CommentRow[], depth: number): React.ReactNode => (
    <ul className={depth === 0 ? "space-y-6" : "mt-3 space-y-0"}>
      {nodes.map((comment) => {
        const replies = tree.byParent.get(comment.id) ?? [];
        return (
          <CommentCard
            key={comment.id}
            comment={comment}
            depth={depth}
            userId={user?.id}
            onReply={setReplyTo}
            onLike={handleLike}
            onDelete={handleDelete}
            onEdit={handleEdit}
          >
            {replyTo === comment.id && user && (
              <div className="mt-3">
                <Composer
                  placeholder={`Responder a ${comment.profiles?.display_name ?? "comentario"}…`}
                  submitting={submitting}
                  autoFocus
                  onCancel={() => setReplyTo(null)}
                  onSubmit={(text) => postComment(text, comment.id)}
                />
              </div>
            )}
            {replies.length > 0 ? renderThread(replies, depth + 1) : null}
          </CommentCard>
        );
      })}
    </ul>
  );

  const total = comments.length;

  return (
    <section className="mt-16 border-t border-foreground/20 pt-10">
      <div className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Conversación
        </span>
        <h2 className="mt-1 font-display text-2xl leading-tight">
          {total === 0
            ? "Comentarios"
            : `${total} ${total === 1 ? "comentario" : "comentarios"}`}
        </h2>
      </div>

      {!authLoading && (
        <div className="mb-10">
          {user ? (
            <Composer
              placeholder="¿Qué te ha parecido? Escribe un comentario…"
              submitting={submitting}
              onSubmit={(text) => postComment(text, null)}
            />
          ) : (
            <div className="border border-dashed border-foreground/20 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  className="font-medium text-[#B22234] underline underline-offset-2"
                >
                  Inicia sesión
                </Link>{" "}
                para comentar, responder y dar me gusta.
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
      ) : tree.roots.length === 0 ? (
        <div className="border border-dashed border-foreground/15 px-6 py-12 text-center">
          <p className="font-display text-lg text-foreground/60">Sé el primero en comentar.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte tu opinión, responde y reacciona con me gusta.
          </p>
        </div>
      ) : (
        renderThread(tree.roots, 0)
      )}
    </section>
  );
}
