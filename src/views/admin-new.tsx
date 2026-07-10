"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminPageHeader } from "@/components/admin-page-header";
import { PageUploader, type PageFile } from "@/components/page-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { pad } from "@/lib/storage";
import { toast } from "sonner";
import {
  IssueContentEditor,
  emptyContent,
  type IssueContent,
} from "@/components/issue-content-editor";

function NewIssue() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [pages, setPages] = useState<PageFile[]>([]);
  const [content, setContent] = useState<IssueContent>(emptyContent);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const onCover = (f: File | null) => {
    setCover(f);
    setCoverUrl(f ? URL.createObjectURL(f) : "");
  };

  const ext = (name: string) => {
    const m = name.match(/\.([a-z0-9]+)$/i);
    return (m?.[1] ?? "jpg").toLowerCase();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cover) return toast.error("Falta la portada");
    if (pages.length === 0) return toast.error("Sube al menos una página");
    setSaving(true);
    try {
      // 1. create issue row (cover/page_count empty for now)
      const { data: issue, error: insErr } = await supabase
        .from("issues")
        .insert({
          number: Number(number),
          title,
          published_at: date,
          page_count: pages.length,
          subtitle: content.subtitle,
          summary: content.summary as any,
          quotes: content.quotes as any,
          credits: content.credits as any,
          show_quotes: content.show_quotes,
        })
        .select()
        .single();
      if (insErr || !issue) throw insErr ?? new Error("No se pudo crear");

      // 2. upload cover
      setProgress("Subiendo portada…");
      const coverPath = `${issue.id}/cover.${ext(cover.name)}`;
      const { error: covErr } = await supabase.storage
        .from("magazines")
        .upload(coverPath, cover, { upsert: true, contentType: cover.type });
      if (covErr) throw covErr;

      // 3. upload pages
      const pageRows: { issue_id: string; index: number; image_path: string }[] = [];
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        setProgress(`Subiendo página ${i + 1}/${pages.length}…`);
        const path = `${issue.id}/pages/${pad(i + 1)}.${ext(p.file.name)}`;
        const { error } = await supabase.storage
          .from("magazines")
          .upload(path, p.file, { upsert: true, contentType: p.file.type });
        if (error) throw error;
        pageRows.push({ issue_id: issue.id, index: i, image_path: path });
      }

      setProgress("Guardando…");
      const { error: pgErr } = await supabase.from("pages").insert(pageRows);
      if (pgErr) throw pgErr;

      const { error: updErr } = await supabase
        .from("issues")
        .update({ cover_path: coverPath })
        .eq("id", issue.id);
      if (updErr) throw updErr;

      // Notify newsletter subscribers automatically.
      setProgress("Avisando a suscriptores…");
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const res = await fetch("/api/admin/notify-issue", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ issueId: issue.id }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            toast.success(
              `Revista publicada · aviso enviado a ${data.sent ?? 0} suscriptor${(data.sent ?? 0) === 1 ? "" : "es"}`,
            );
          } else {
            toast.success("Revista publicada");
            toast.error(`No se pudo avisar: ${data.error ?? res.statusText}`);
          }
        } else {
          toast.success("Revista publicada");
        }
      } catch (notifyErr: any) {
        toast.success("Revista publicada");
        toast.error(`No se pudo avisar: ${notifyErr.message ?? "error"}`);
      }

      router.push("/admin");
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-10">
      <AdminPageHeader
        kicker="Revistas · Nuevo número"
        title="Publicar revista"
        description="Portada, páginas y ficha del número. No confundir con artículos de sección (/publicar)."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Número</Label>
          <Input
            type="number"
            min={1}
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="mt-2"
          />
        </div>
        <div className="md:col-span-1">
          <Label className="text-[11px] uppercase tracking-widest">Fecha</Label>
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Título</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-widest">Portada</Label>
        <div className="mt-2 flex items-start gap-4">
          <label className="flex h-40 w-32 cursor-pointer items-center justify-center border border-dashed border-foreground/30 bg-muted text-xs text-muted-foreground">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              "Subir"
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onCover(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <PageUploader pages={pages} onChange={setPages} />

      <div className="border-t border-foreground/20 pt-10">
        <h3 className="mb-6 font-display text-2xl">Contenido de la página de la revista</h3>
        <IssueContentEditor value={content} onChange={setContent} />
      </div>

      <div className="flex items-center gap-4 border-t border-foreground/20 pt-6">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Publicar revista"}
        </Button>
        {progress && <span className="font-mono text-xs text-muted-foreground">{progress}</span>}
      </div>
    </form>
  );
}

export function AdminNewPage() {
  return (
    <AdminShell adminOnly>
      <NewIssue />
    </AdminShell>
  );
}
