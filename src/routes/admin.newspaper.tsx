import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { sectionLabel } from "@/lib/sections";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/newspaper")({
  component: () => (
    <AdminShell>
      <NewspaperBuilder />
    </AdminShell>
  ),
});

type Post = {
  id: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  cover_path: string | null;
  cover_position: string | null;
  author: string | null;
  published_at: string;
};

type Size = "grande" | "mediana" | "pequena";

type Selection = {
  postId: string;
  page: number;
  size: Size;
  order: number;
};

function NewspaperBuilder() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [edition, setEdition] = useState("Nº 1");
  const [dateStr, setDateStr] = useState(
    new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  );
  const [pageCount, setPageCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,section,slug,title,excerpt,content_html,cover_path,cover_position,author,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setPosts(data ?? []);
    })();
  }, []);

  const toggle = (p: Post) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        const order = Object.keys(next).length;
        next[p.id] = { postId: p.id, page: 1, size: "mediana", order };
      }
      return next;
    });
  };

  const update = (id: string, patch: Partial<Selection>) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const pagesData = useMemo(() => {
    const byPage: Record<number, (Selection & { post: Post })[]> = {};
    for (const sel of Object.values(selections)) {
      const post = posts?.find((p) => p.id === sel.postId);
      if (!post) continue;
      (byPage[sel.page] ||= []).push({ ...sel, post });
    }
    for (const k of Object.keys(byPage)) {
      byPage[+k].sort((a, b) => a.order - b.order);
    }
    return byPage;
  }, [selections, posts]);

  const captureAll = async () => {
    const { toJpeg } = await import("html-to-image");
    const pages = renderRef.current?.querySelectorAll<HTMLElement>("[data-newspaper-page]") ?? [];
    if (pages.length === 0) throw new Error("Añade al menos una noticia");
    const images: string[] = [];
    for (const node of Array.from(pages)) {
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#f5f1e8",
        cacheBust: true,
      });
      images.push(dataUrl);
    }
    return images;
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const images = await captureAll();
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "in", format: [11, 17], orientation: "portrait" });
      images.forEach((img, i) => {
        if (i > 0) pdf.addPage([11, 17], "portrait");
        pdf.addImage(img, "JPEG", 0, 0, 11, 17);
      });
      pdf.save(`rheckypolitan-${edition.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF generado");
    } catch (e: any) {
      toast.error(e?.message ?? "Error generando PDF");
    } finally {
      setGenerating(false);
    }
  };

  const generateJpg = async () => {
    setGenerating(true);
    try {
      const images = await captureAll();
      images.forEach((img, i) => {
        const a = document.createElement("a");
        a.href = img;
        a.download = `rheckypolitan-${edition.replace(/\s+/g, "-").toLowerCase()}-pag${i + 1}.jpg`;
        a.click();
      });
      toast.success("JPG(s) generados");
    } catch (e: any) {
      toast.error(e?.message ?? "Error generando JPG");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Maquetar</p>
          <h2 className="mt-1 font-display text-4xl">Crear periódico</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateJpg} disabled={generating || Object.keys(selections).length === 0}>
            {generating ? "…" : "Descargar JPG"}
          </Button>
          <Button onClick={generatePdf} disabled={generating || Object.keys(selections).length === 0}>
            {generating ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label>Edición</Label>
          <Input value={edition} onChange={(e) => setEdition(e.target.value)} />
        </div>
        <div>
          <Label>Fecha (texto cabecera)</Label>
          <Input value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </div>
        <div>
          <Label>Nº de páginas</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={pageCount}
            onChange={(e) => setPageCount(Math.max(1, Math.min(20, +e.target.value || 1)))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr,520px]">
        {/* Selector */}
        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Noticias publicadas
          </h3>
          {posts === null ? (
            <p className="font-mono text-xs">Cargando…</p>
          ) : posts.length === 0 ? (
            <p className="font-mono text-xs">No hay noticias publicadas.</p>
          ) : (
            <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
              {posts.map((p) => {
                const sel = selections[p.id];
                return (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!sel}
                      onChange={() => toggle(p)}
                      className="h-4 w-4"
                    />
                    <div className="h-12 w-16 shrink-0 bg-muted">
                      {p.cover_path && (
                        <img src={publicUrl(p.cover_path)} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {sectionLabel(p.section)}
                      </div>
                      <div className="truncate font-display text-base">{p.title}</div>
                    </div>
                    {sel && (
                      <div className="flex shrink-0 gap-2">
                        <select
                          value={sel.page}
                          onChange={(e) => update(p.id, { page: +e.target.value })}
                          className="border border-foreground/20 bg-background px-2 py-1 text-xs"
                        >
                          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Pág {n}
                              {n === 1 ? " · portada" : ""}
                            </option>
                          ))}
                        </select>
                        <select
                          value={sel.size}
                          onChange={(e) => update(p.id, { size: e.target.value as Size })}
                          className="border border-foreground/20 bg-background px-2 py-1 text-xs"
                        >
                          <option value="grande">Principal</option>
                          <option value="mediana">Destacada</option>
                          <option value="pequena">Breve</option>
                        </select>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Preview */}
        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Vista previa
          </h3>
          <div className="space-y-6">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <div key={n} className="border border-foreground/10 shadow-sm overflow-hidden">
                <div className="bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest">
                  Página {n}
                </div>
                <div style={{ width: 495, height: 765, overflow: "hidden" }}>
                  <div style={{ transform: "scale(0.45)", transformOrigin: "top left" }}>
                    <NewspaperPage
                      pageNumber={n}
                      totalPages={pageCount}
                      edition={edition}
                      dateStr={dateStr}
                      items={pagesData[n] ?? []}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Off-screen full-size render for capture */}
      <div
        ref={renderRef}
        style={{ position: "fixed", left: "-10000px", top: 0, width: "1100px" }}
        aria-hidden
      >
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <div key={n} data-newspaper-page>
            <NewspaperPage
              pageNumber={n}
              totalPages={pageCount}
              edition={edition}
              dateStr={dateStr}
              items={pagesData[n] ?? []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Newspaper page renderer ---------------- */

function NewspaperPage({
  pageNumber,
  totalPages,
  edition,
  dateStr,
  items,
}: {
  pageNumber: number;
  totalPages: number;
  edition: string;
  dateStr: string;
  items: (Selection & { post: Post })[];
}) {
  const isCover = pageNumber === 1;
  return (
    <div
      style={{
        width: "1100px",
        height: "1700px",
        background: "#f5f1e8",
        color: "#111111",
        fontFamily: "'Times New Roman', Georgia, serif",
        padding: "48px 56px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Masthead */}
      <div style={{ borderBottom: "3px double #111111", paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#222222" }}>
          <span>{edition}</span>
          <span style={{ fontStyle: "italic" }}>"All the news that's barely fit to print"</span>
          <span>Página {pageNumber} / {totalPages}</span>
        </div>
        <h1
          style={{
            fontFamily: "'Times New Roman', Georgia, serif",
            fontSize: isCover ? 150 : 72,
            margin: "8px 0 4px",
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            color: "#111111",
          }}
        >
          Rheckypolitan
        </h1>
        <div style={{ borderTop: "1px solid #111111", borderBottom: "1px solid #111111", padding: "6px 0", display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#222222" }}>
          <span>{dateStr}</span>
          <span>★ Edición Independiente ★</span>
          <span>Precio · Gratis</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, marginTop: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {items.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999999", fontStyle: "italic" }}>
            Página sin contenido asignado.
          </div>
        ) : (
          <NytLayout items={items} isCover={isCover} />
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #111111", marginTop: 12, paddingTop: 8, textAlign: "center", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#222222" }}>
        © Rheckypolitan · {edition} · Página {pageNumber}
      </div>
    </div>
  );
}

/* ---- NYT-style adaptive layout ---- */

function NytLayout({ items, isCover }: { items: (Selection & { post: Post })[]; isCover: boolean }) {
  const count = items.length;

  // Single article fills the whole page (NYT lead style)
  if (count === 1) {
    return <LeadArticle item={items[0]} hero fullPage />;
  }

  // Two articles: big lead + secondary stacked
  if (count === 2) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
        <LeadArticle item={items[0]} hero />
        <Divider />
        <LeadArticle item={items[1]} />
      </div>
    );
  }

  // Three+: lead on top spanning width, then grid below
  const [lead, ...rest] = items;
  const cols = rest.length >= 3 ? 3 : 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <LeadArticle item={lead} hero={isCover} />
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 22, flex: 1 }}>
        {rest.map((it, i) => (
          <div key={it.postId} style={{ borderLeft: i === 0 ? "none" : "1px solid #111111", paddingLeft: i === 0 ? 0 : 22 }}>
            <SmallArticle item={it} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #111111", margin: "0" }} />;
}

function LeadArticle({
  item,
  hero,
  fullPage,
}: {
  item: Selection & { post: Post };
  hero?: boolean;
  fullPage?: boolean;
}) {
  const p = item.post;
  const text = stripHtml(p.content_html);
  const titleSize = fullPage ? 92 : hero ? 64 : 40;
  const imgHeight = fullPage ? 620 : hero ? 380 : 220;

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 10, flex: fullPage ? 1 : "initial" }}>
      <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#B22234", fontWeight: 700, textAlign: "center" }}>
        ◆ {sectionLabel(p.section)} ◆
      </div>
      <h2
        style={{
          fontSize: titleSize,
          lineHeight: 1.02,
          margin: "4px 0",
          fontWeight: 900,
          letterSpacing: -1,
          textAlign: "center",
          color: "#111111",
        }}
      >
        {p.title}
      </h2>
      {p.excerpt && (
        <p style={{ fontStyle: "italic", fontSize: fullPage ? 22 : 17, textAlign: "center", margin: "0 auto", maxWidth: "85%", lineHeight: 1.3, color: "#222222" }}>
          {p.excerpt}
        </p>
      )}
      {p.author && (
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#555555", textAlign: "center" }}>
          Por {p.author}
        </div>
      )}
      {p.cover_path && (
        <img
          src={publicUrl(p.cover_path)}
          crossOrigin="anonymous"
          alt=""
          style={{
            width: "100%",
            height: imgHeight,
            objectFit: "cover",
            objectPosition: p.cover_position ?? "50% 50%",
            border: "1px solid #111111",
            marginTop: 6,
          }}
        />
      )}
      {text && (
        <p
          style={{
            fontSize: fullPage ? 17 : 14,
            lineHeight: 1.55,
            margin: "8px 0 0",
            columnCount: fullPage ? 3 : hero ? 3 : 2,
            columnGap: 22,
            columnRule: "1px solid #cccccc",
            textAlign: "justify",
            color: "#111111",
            flex: fullPage ? 1 : "initial",
            overflow: "hidden",
          }}
        >
          {text}
        </p>
      )}
    </article>
  );
}

function SmallArticle({ item }: { item: Selection & { post: Post } }) {
  const p = item.post;
  const text = stripHtml(p.content_html);
  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#B22234", fontWeight: 700 }}>
        {sectionLabel(p.section)}
      </div>
      <h3 style={{ fontSize: 24, lineHeight: 1.1, margin: 0, fontWeight: 900, letterSpacing: -0.3, color: "#111111" }}>
        {p.title}
      </h3>
      {p.author && (
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#555555" }}>
          Por {p.author}
        </div>
      )}
      {p.cover_path && (
        <img
          src={publicUrl(p.cover_path)}
          crossOrigin="anonymous"
          alt=""
          style={{
            width: "100%",
            height: 140,
            objectFit: "cover",
            objectPosition: p.cover_position ?? "50% 50%",
            border: "1px solid #111111",
          }}
        />
      )}
      {p.excerpt && (
        <p style={{ fontStyle: "italic", fontSize: 12, margin: "2px 0", lineHeight: 1.3, color: "#333333" }}>
          {p.excerpt}
        </p>
      )}
      {text && (
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            margin: 0,
            textAlign: "justify",
            color: "#111111",
            display: "-webkit-box",
            WebkitLineClamp: 12,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {text}
        </p>
      )}
    </article>
  );
}

function stripHtml(html: string) {
  if (!html) return "";
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent ?? "").replace(/\s+/g, " ").trim();
}
