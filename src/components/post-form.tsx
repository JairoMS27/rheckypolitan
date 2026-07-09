import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { RichEditor } from "@/components/rich-editor";
import { SECTIONS, slugify, type SectionKey } from "@/lib/sections";
import { useAuth } from "@/hooks/use-auth";

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

export function PostForm({ initial }: { initial: PostInput }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<PostInput>(initial);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const onTitle = (t: string) => {
    setData((d) => ({
      ...d,
      title: t,
      slug: d.slug && d.id ? d.slug : slugify(t),
    }));
  };

  const uploadCover = async (postId: string): Promise<string | null> => {
    if (!coverFile) return data.cover_path;
    const ext = coverFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `posts/${postId}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("magazines")
      .upload(path, coverFile, { upsert: true, contentType: coverFile.type });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title.trim()) return toast.error("Falta el título");
    if (!data.slug.trim()) return toast.error("Falta el slug");
    setSaving(true);
    try {
      const payload = {
        section: data.section,
        slug: slugify(data.slug),
        title: data.title.trim(),
        excerpt: data.excerpt.trim() || null,
        content_html: data.content_html,
        author: data.author.trim() || null,
        published: data.published,
        published_at: new Date(data.published_at).toISOString(),
        cover_position: data.cover_position || "50% 50%",
      };

      let postId = data.id;
      if (postId) {
        const cover = await uploadCover(postId);
        const { error } = await supabase
          .from("posts")
          .update({ ...payload, cover_path: cover })
          .eq("id", postId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("posts")
          .insert({
            ...payload,
            cover_path: null,
            author_id: user?.id ?? null,
          })
          .select()
          .single();
        if (error || !inserted) throw error ?? new Error("No se pudo crear");
        postId = inserted.id;
        if (coverFile) {
          const cover = await uploadCover(postId);
          await supabase.from("posts").update({ cover_path: cover }).eq("id", postId);
        }
      }
      toast.success("Guardado");
      navigate({ to: "/admin/posts" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const coverPreview = coverFile
    ? URL.createObjectURL(coverFile)
    : data.cover_path
      ? supabase.storage.from("magazines").getPublicUrl(data.cover_path).data.publicUrl
      : "";

  const onPickFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = previewRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    set("cover_position", `${x.toFixed(1)}% ${y.toFixed(1)}%`);
  };

  return (
    <form onSubmit={submit} className="space-y-10">
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Título</Label>
          <Input
            required
            value={data.title}
            onChange={(e) => onTitle(e.target.value)}
            className="mt-2"
            placeholder="Titular de la noticia"
          />
          <div className="mt-4 grid grid-cols-[1fr_1fr] gap-4">
            <div>
              <Label className="text-[11px] uppercase tracking-widest">Slug</Label>
              <Input
                value={data.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="mt-2 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-widest">Autor</Label>
              <Input
                value={data.author}
                onChange={(e) => set("author", e.target.value)}
                className="mt-2"
                placeholder="Firma"
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-[11px] uppercase tracking-widest">Sección</Label>
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
            <Label className="text-[11px] uppercase tracking-widest">Fecha</Label>
            <Input
              type="date"
              value={data.published_at}
              onChange={(e) => set("published_at", e.target.value)}
              className="mt-2"
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
          placeholder="Resumen breve que se mostrará en el listado."
        />
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-widest">Portada</Label>
        <div className="mt-2 flex items-start gap-6">
          <label className="flex h-40 w-56 cursor-pointer items-center justify-center overflow-hidden border border-dashed border-foreground/30 bg-muted text-xs text-muted-foreground">
            {coverPreview ? (
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              "Subir portada"
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {coverPreview && (
            <div className="flex-1 max-w-md">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Haz clic en la imagen para elegir el punto de interés
              </p>
              <div
                ref={previewRef}
                onClick={onPickFocus}
                className="relative mt-2 aspect-[4/3] w-full cursor-crosshair overflow-hidden border border-foreground/20 bg-muted"
              >
                <img
                  src={coverPreview}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: data.cover_position }}
                />
                {(() => {
                  const [xs, ys] = data.cover_position.split(" ");
                  return (
                    <div
                      className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_#B22234]"
                      style={{ left: xs, top: ys }}
                    />
                  );
                })()}
              </div>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                Foco: {data.cover_position}
              </p>
            </div>
          )}

          {(coverFile || data.cover_path) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCoverFile(null);
                set("cover_path", null);
                set("cover_position", "50% 50%");
              }}
            >
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-widest">Contenido</Label>
        <div className="mt-2">
          <RichEditor value={data.content_html} onChange={(html) => set("content_html", html)} />
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-foreground/20 pt-6">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : data.id ? "Guardar cambios" : "Publicar noticia"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/posts" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
