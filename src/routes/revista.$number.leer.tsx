import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";

export const Route = createFileRoute("/revista/$number/leer")({
  component: IssueViewer,
  head: ({ params }) => {
    const numFmt = String(params.number).padStart(2, "0");
    const url = `https://rheckypolitan.es/revista/${params.number}/leer`;
    const title = `Leer N.º ${numFmt} — Rheckypolitan`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Lee el número ${numFmt} de Rheckypolitan página a página, como una revista de papel.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: `Lee el número ${numFmt} de Rheckypolitan página a página, como una revista de papel.`,
        },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

type Issue = { id: string; number: number; title: string };
type Page = { index: number; image_path: string };

function IssueViewer() {
  const { number } = Route.useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [pages, setPages] = useState<Page[] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [size, setSize] = useState({ w: 500, h: 700 });
  const [pageRatio, setPageRatio] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: iss } = await supabase
        .from("issues")
        .select("id,number,title")
        .eq("number", Number(number))
        .maybeSingle();
      if (!iss) {
        setIssue(null);
        setPages([]);
        return;
      }
      setIssue(iss);
      const { data: pg } = await supabase
        .from("pages")
        .select("index,image_path")
        .eq("issue_id", iss.id)
        .order("index");
      setPages(pg ?? []);
      if (pg && pg.length > 0) {
        const img = new Image();
        img.onload = () => {
          if (img.naturalHeight > 0) setPageRatio(img.naturalWidth / img.naturalHeight);
        };
        img.src = publicUrl(pg[0].image_path);
      }
    })();
  }, [number]);

  // responsive size
  useEffect(() => {
    if (pageRatio == null) return;
    const update = () => {
      const portrait = window.innerWidth < 900;
      setIsPortrait(portrait);
      const padding = 80;
      const maxH = window.innerHeight - padding * 2;
      const maxW = window.innerWidth - padding;
      let h = maxH;
      let w = portrait ? h * pageRatio : h * pageRatio * 2;
      if (w > maxW) {
        w = maxW;
        h = portrait ? w / pageRatio : w / 2 / pageRatio;
      }
      const singleW = portrait ? w : w / 2;
      setSize({ w: Math.floor(singleW), h: Math.floor(h) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [pageRatio]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") bookRef.current?.pageFlip()?.flipNext();
      else if (e.key === "ArrowLeft") bookRef.current?.pageFlip()?.flipPrev();
      else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else navigate({ to: "/revista/$number", params: { number } });
      } else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  if (issue === null && pages !== null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="font-display text-3xl">Número no encontrado</p>
        <Link to="/" className="mt-6 text-xs uppercase tracking-widest underline">
          Volver al archivo
        </Link>
      </div>
    );
  }

  const totalPages = pages?.length ?? 0;
  const displayPage = Math.min(currentPage + 1, totalPages);

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col bg-black text-white">
      <h1 className="sr-only">
        {issue ? `${issue.title} — Rheckypolitan N.º ${String(issue.number).padStart(2, "0")}` : `Rheckypolitan N.º ${String(number).padStart(2, "0")}`}
      </h1>
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <Link
          to="/revista/$number"
          params={{ number }}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
        >
          <X className="h-4 w-4" />
          Cerrar
        </Link>
        <div className="text-center">
          <div className="font-display text-base">{issue?.title ?? "—"}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            Rheckypolitan · N.º {issue ? String(issue.number).padStart(2, "0") : "—"}
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          className="text-white/60 transition hover:text-white"
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* book */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {pages === null || (pages.length > 0 && pageRatio == null) ? (
          <div className="font-mono text-xs uppercase tracking-widest text-white/40">Cargando…</div>
        ) : pages.length === 0 ? (
          <div className="font-mono text-xs uppercase tracking-widest text-white/40">
            Sin páginas
          </div>
        ) : (
          <HTMLFlipBook
            ref={bookRef}
            width={size.w}
            height={size.h}
            size="fixed"
            minWidth={200}
            maxWidth={2000}
            minHeight={300}
            maxHeight={2500}
            drawShadow
            flippingTime={900}
            usePortrait={isPortrait}
            startPage={0}
            showCover={true}
            mobileScrollSupport
            maxShadowOpacity={0.6}
            className="rheckypolitan-book"
            style={{}}
            startZIndex={0}
            autoSize={false}
            clickEventForward={false}
            useMouseEvents
            swipeDistance={3}
            showPageCorners={false}
            disableFlipByClick={true}
            onFlip={(e: any) => setCurrentPage(e.data)}
          >
            {pages.map((p) => (
              <div key={p.index} className="flex h-full w-full items-center justify-center bg-white">
                <img
                  src={publicUrl(p.image_path)}
                  alt={`Página ${p.index + 1}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </HTMLFlipBook>
        )}

        {/* nav arrows */}
        {totalPages > 0 && (
          <>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                bookRef.current?.pageFlip()?.flipPrev();
              }}
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition hover:text-white active:bg-black/70 disabled:opacity-30"
              aria-label="Anterior"
              disabled={currentPage <= 0}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                bookRef.current?.pageFlip()?.flipNext();
              }}
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition hover:text-white active:bg-black/70 disabled:opacity-30"
              aria-label="Siguiente"
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

      {/* bottom indicator + progress */}
      <div className="flex flex-col items-center gap-2 px-5 py-4">
        <div className="flex w-full max-w-md items-center gap-3">
          <span className="font-mono text-[10px] tabular-nums text-white/50">
            {totalPages > 0 ? String(displayPage).padStart(2, "0") : "—"}
          </span>
          <div className="relative h-[2px] flex-1 overflow-hidden bg-white/10">
            <div
              className="absolute inset-y-0 left-0 bg-white transition-[width] duration-500 ease-out"
              style={{
                width: totalPages > 0 ? `${(displayPage / totalPages) * 100}%` : "0%",
              }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-white/50">
            {totalPages > 0 ? String(totalPages).padStart(2, "0") : "—"}
          </span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {totalPages > 0 ? `Página ${displayPage} de ${totalPages}` : "—"}
        </div>
      </div>
    </div>
  );
}
