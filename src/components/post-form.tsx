"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RichEditor } from "@/components/rich-editor";
import { CoverPositionPicker } from "@/components/cover-position-picker";
import { SECTIONS, slugify, type SectionKey } from "@/lib/sections";
import { useAuth } from "@/hooks/use-auth";
import { authorPostsListPath } from "@/lib/dashboard-paths";
import { saveAuthorPost, uploadAuthorImage } from "@/lib/author-api";
import { Info } from "lucide-react";

export type PostInput = {
  id?: string;
  section: SectionKey;
  slug: string;
  title: string;
  excerpt: string;
  cover_path: string | null;
  cover_position: string;
  content_html: string;
  author: string;
  published: boolean;
  published_at: string;
  author_id?: string | null;
};

function RequiredMark() {
  return (
    <span className="text-[#B22234]" aria-hidden>
      *
    </span>
  );
}

export function PostForm({
  initial,
  returnTo = authorPostsListPath(),
}: {
  initial: PostInput;
  /** Where to go after save/cancel (author surface defaults to /publicar). */
  returnTo?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<PostInput>(initial);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const coverObjectUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );

  useEffect(() => {
    return () => {
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    };
  }, [coverObjectUrl]);

  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const onTitle = (t: string) => {
    setData((d) => ({
      ...d,
      title: t,
      slug: d.slug && d.id ? d.slug : slugify(t),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Inicia sesión para publicar");
    if (!data.title.trim()) return toast.error("Falta el título");
    if (!data.slug.trim()) return toast.error("Falta el slug");
    setSaving(true);
    try {
      const base = {
        section: data.section,
        slug: slugify(data.slug),
        title: data.title.trim(),
        excerpt: data.excerpt.trim() || null,
        content_html: data.content_html,
        author: data.author.trim() || null,
        published: data.published,
        published_at: new Date(data.published_at).toISOString(),
        cover_position: data.cover_position || "50% 50%",
        cover_path: data.cover_path,
      };

      // Create first if new so we have an id for cover path posts/{id}/...
      let postId = data.id;
      if (!postId) {
        const created = await saveAuthorPost({ ...base, cover_path: null });
        postId = created.id;
      }

      let coverPath = data.cover_path;
      if (coverFile && postId) {
        const up = await uploadAuthorImage(coverFile, { kind: "cover", postId });
        coverPath = up.path;
      }

      await saveAuthorPost({
        ...base,
        id: postId,
        cover_path: coverPath,
      });

      toast.success("Guardado");
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const coverPreview =
    coverObjectUrl ||
    (data.cover_path
      ? supabase.storage.from("magazines").getPublicUrl(data.cover_path).data.publicUrl
      : "");

  const onCoverFile = (file: File | null) => {
    setCoverFile(file);
    if (file) set("cover_position", "50% 50%");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <form onSubmit={submit} className="space-y-10">
        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
          <div>
            <Label className="text-[11px] uppercase tracking-widest">
              Título <RequiredMark />
            </Label>
            <Input
              required
              value={data.title}
              onChange={(e) => onTitle(e.target.value)}
              className="mt-2"
              placeholder="Titular de la noticia"
              aria-required
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] uppercase tracking-widest" htmlFor="post-slug">
                    Slug <RequiredMark />
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/20 text-muted-foreground transition hover:border-[#B22234] hover:text-[#B22234]"
                        aria-label="Qué es el slug"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
                      El slug es la parte de la URL del artículo (por ejemplo{" "}
                      <span className="font-mono">/noticia/actualidad/mi-titular</span>). Se genera
                      solo a partir del título; puedes editarlo si quieres una dirección más corta o
                      clara.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="post-slug"
                  required
                  value={data.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  className="mt-2 font-mono text-xs"
                  placeholder="mi-articulo"
                  aria-required
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest">Autor</Label>
                <Input
                  value={data.author}
                  onChange={(e) => set("author", e.target.value)}
                  className="mt-2"
                  placeholder="Firma que verán los lectores"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-[11px] uppercase tracking-widest">
                Sección <RequiredMark />
              </Label>
              <Select value={data.section} onValueChange={(v) => set("section", v as SectionKey)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-widest">
                Fecha <RequiredMark />
              </Label>
              <Input
                type="date"
                required
                value={data.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                className="mt-2"
                aria-required
              />
            </div>
            <div className="flex items-center justify-between rounded border border-foreground/10 px-3 py-2">
              <Label className="text-[11px] uppercase tracking-widest">
                {data.published ? "Publicado" : "Borrador"}
              </Label>
              <Switch checked={data.published} onCheckedChange={(v) => set("published", v)} />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-widest">Extracto</Label>
          <Textarea
            rows={2}
            value={data.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            className="mt-2"
            placeholder="Resumen breve que se mostrará en el listado (opcional)."
          />
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-widest">Portada</Label>
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              <label className="flex h-36 w-52 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-dashed border-foreground/30 bg-muted text-xs text-muted-foreground transition hover:border-[#B22234]/50 hover:text-foreground">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: data.cover_position }}
                  />
                ) : (
                  <span className="px-4 text-center leading-relaxed">
                    Subir portada
                    <br />
                    <span className="text-[10px] uppercase tracking-widest opacity-70">
                      JPG, PNG o WebP
                    </span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onCoverFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {(coverFile || data.cover_path) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCoverFile(null);
                    set("cover_path", null);
                    set("cover_position", "50% 50%");
                  }}
                >
                  Quitar portada
                </Button>
              )}
            </div>

            {coverPreview && (
              <CoverPositionPicker
                src={coverPreview}
                position={data.cover_position}
                onChange={(pos) => set("cover_position", pos)}
              />
            )}
          </div>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-widest">Contenido</Label>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Escribe como en una revista: lead, intertítulos, citas e imágenes. El formato se ve
            igual en la página pública.
          </p>
          <RichEditor value={data.content_html} onChange={(html) => set("content_html", html)} />
        </div>

        <div className="flex items-center gap-4 border-t border-foreground/20 pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : data.id ? "Guardar cambios" : "Publicar artículo"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(returnTo)}>
            Cancelar
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
