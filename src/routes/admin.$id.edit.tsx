import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { pad, publicUrl } from "@/lib/storage";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";
import {
  IssueContentEditor,
  emptyContent,
  type IssueContent,
} from "@/components/issue-content-editor";

export const Route = createFileRoute("/admin/$id/edit")({
  component: () => (
    <AdminShell adminOnly>
      <EditIssue />
    </AdminShell>
  ),
});

type Page = { id: string; index: number; image_path: string };

function EditIssue() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [content, setContent] = useState<IssueContent>(emptyContent);

  useEffect(() => {
    (async () => {
      const { data: iss } = await supabase.from("issues").select("*").eq("id", id).maybeSingle();
      if (iss) {
        setNumber(String(iss.number));
        setTitle(iss.title);
        setDate(iss.published_at);
        setCoverPath(iss.cover_path);
        setContent({
          subtitle: (iss as any).subtitle ?? "",
          summary: ((iss as any).summary as any[]) ?? [],
          quotes: ((iss as any).quotes as any[]) ?? [],
          credits: ((iss as any).credits as any[]) ?? [],
          show_quotes: (iss as any).show_quotes ?? true,
        });
      }
      const { data: pg } = await supabase
        .from("pages")
        .select("id,index,image_path")
        .eq("issue_id", id)
        .order("index");
      setPages(pg ?? []);
    })();
  }, [id]);

  const ext = (name: string) => (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg").toLowerCase();

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...pages];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setPages(next);
  };

  const replaceCover = async (file: File) => {
    setProgress("Subiendo portada…");
    // Unique filename so the public URL always changes (avoids CDN/browser cache)
    const path = `${id}/cover_${Date.now()}.${ext(file.name)}`;
    const { error } = await supabase.storage
      .from("magazines")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error(error.message);
      setProgress("");
      return;
    }
    // Remove the previous cover file from storage so we don't leave orphans
    if (coverPath && coverPath !== path) {
      await supabase.storage.from("magazines").remove([coverPath]);
    }
    await supabase.from("issues").update({ cover_path: path }).eq("id", id);
    setCoverPath(path);
    setProgress("");
    toast.success("Portada actualizada");
  };

  const addPages = async (files: FileList | null) => {
    if (!files) return;
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    setSaving(true);
    try {
      const startIdx = pages.length;
      const newPages: Page[] = [];
      for (let i = 0; i < sorted.length; i++) {
        setProgress(`Subiendo ${i + 1}/${sorted.length}…`);
        const f = sorted[i];
        const path = `${id}/pages/${pad(startIdx + i + 1)}_${Date.now()}.${ext(f.name)}`;
        const { error } = await supabase.storage
          .from("magazines")
          .upload(path, f, { upsert: true, contentType: f.type });
        if (error) throw error;
        const { data, error: insErr } = await supabase
          .from("pages")
          .insert({ issue_id: id, index: startIdx + i, image_path: path })
          .select("id,index,image_path")
          .single();
        if (insErr) throw insErr;
        newPages.push(data);
      }
      const next = [...pages, ...newPages];
      setPages(next);
      await supabase.from("issues").update({ page_count: next.length }).eq("id", id);
      toast.success("Páginas añadidas");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const removePage = async (page: Page) => {
    if (!confirm("¿Quitar esta página?")) return;
    await supabase.storage.from("magazines").remove([page.image_path]);
    await supabase.from("pages").delete().eq("id", page.id);
    const next = pages.filter((p) => p.id !== page.id);
    // re-index remaining
    for (let i = 0; i < next.length; i++) {
      if (next[i].index !== i) {
        await supabase.from("pages").update({ index: i }).eq("id", next[i].id);
        next[i].index = i;
      }
    }
    setPages(next);
    await supabase.from("issues").update({ page_count: next.length }).eq("id", id);
  };

  const saveMeta = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("issues")
      .update({
        number: Number(number),
        title,
        published_at: date,
        subtitle: content.subtitle,
        summary: content.summary as any,
        quotes: content.quotes as any,
        credits: content.credits as any,
        show_quotes: content.show_quotes,
      })
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Guardado");
  };

  const saveOrder = async () => {
    setSaving(true);
    setProgress("Reordenando…");
    try {
      // two-pass to avoid unique conflicts
      for (let i = 0; i < pages.length; i++) {
        await supabase.from("pages").update({ index: 1000 + i }).eq("id", pages[i].id);
      }
      for (let i = 0; i < pages.length; i++) {
        await supabase.from("pages").update({ index: i }).eq("id", pages[i].id);
      }
      toast.success("Orden guardado");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Editando
          </p>
          <h2 className="mt-1 font-display text-4xl">N.º {number}</h2>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>
          Volver
        </Button>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Número</Label>
          <Input type="number" value={number} onChange={(e) => setNumber(e.target.value)} className="mt-2" />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2" />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-widest">Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
        </div>
      </section>

      <section className="border-t border-foreground/20 pt-8">
        <h3 className="mb-6 font-display text-2xl">Contenido de la página de la revista</h3>
        <IssueContentEditor value={content} onChange={setContent} />
      </section>

      <Button onClick={saveMeta} disabled={saving}>Guardar datos</Button>

      <section>
        <Label className="text-[11px] uppercase tracking-widest">Portada</Label>
        <div className="mt-2 flex items-center gap-4">
          <div className="h-40 w-32 bg-muted">
            {coverPath && <img src={publicUrl(coverPath)} alt="" className="h-full w-full object-cover" />}
          </div>
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && replaceCover(e.target.files[0])}
            />
            <Button type="button" variant="outline" asChild>
              <span>Reemplazar portada</span>
            </Button>
          </label>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <Label className="text-[11px] uppercase tracking-widest">Páginas · {pages.length}</Label>
          <div className="flex gap-2">
            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addPages(e.target.files)}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>+ Añadir</span>
              </Button>
            </label>
            <Button onClick={saveOrder} size="sm" disabled={saving}>Guardar orden</Button>
          </div>
        </div>

        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin páginas.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
            {pages.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndex === null) return;
                  reorder(dragIndex, i);
                  setDragIndex(i);
                }}
                onDragEnd={() => setDragIndex(null)}
                className="group relative aspect-[3/4] cursor-grab bg-muted active:cursor-grabbing"
              >
                <img src={publicUrl(p.image_path)} alt="" className="h-full w-full object-cover" />
                <div className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removePage(p)}
                  className="absolute right-1 top-1 bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <GripVertical className="absolute bottom-1 left-1 h-4 w-4 text-white opacity-0 drop-shadow group-hover:opacity-100" />
              </li>
            ))}
          </ul>
        )}
        {progress && <p className="mt-3 font-mono text-xs text-muted-foreground">{progress}</p>}
      </section>
    </div>
  );
}
