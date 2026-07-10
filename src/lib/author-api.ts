import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  return { Authorization: `Bearer ${token}` };
}

export type AuthorPostRow = {
  id: string;
  section: string;
  slug: string;
  title: string;
  cover_path: string | null;
  published: boolean;
  published_at: string;
  author_id: string | null;
  excerpt?: string | null;
  author?: string | null;
};

export async function fetchAuthorPosts(): Promise<{
  posts: AuthorPostRow[];
  isAdmin: boolean;
}> {
  const headers = await authHeaders();
  const res = await fetch("/api/publicar", { headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar los artículos");
  return { posts: json.posts ?? [], isAdmin: Boolean(json.isAdmin) };
}

export async function saveAuthorPost(body: Record<string, unknown>) {
  const headers = {
    ...(await authHeaders()),
    "Content-Type": "application/json",
  };
  const res = await fetch("/api/publicar", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "No se pudo guardar el artículo");
  return json.post as AuthorPostRow & { content_html?: string };
}

export async function deleteAuthorPost(id: string) {
  const headers = await authHeaders();
  const res = await fetch(`/api/publicar?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "No se pudo borrar");
}

export async function uploadAuthorImage(
  file: File,
  opts?: { kind?: "cover" | "inline"; postId?: string },
): Promise<{ path: string; publicUrl: string }> {
  const headers = await authHeaders();
  const form = new FormData();
  form.set("file", file);
  form.set("kind", opts?.kind ?? "inline");
  if (opts?.postId) form.set("postId", opts.postId);
  const res = await fetch("/api/publicar/upload", {
    method: "POST",
    headers,
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "No se pudo subir la imagen");
  return { path: json.path, publicUrl: json.publicUrl };
}
