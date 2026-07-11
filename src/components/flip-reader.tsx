"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { publicUrl } from "@/lib/storage";
import { applyFlipReport, clampPageIndex, displayPageNumber } from "@/lib/page-index";

export type FlipPage = {
  index: number;
  image_path: string;
};

type Props = {
  title: string;
  number: number;
  pages: FlipPage[];
  onClose: () => void;
  /** Optional class for the full-screen root */
  className?: string;
  /** Label for the close / return control (e.g. "Volver al Estante"). */
  closeLabel?: string;
  /** Show page thumbnails strip for quick navigation. */
  showThumbnails?: boolean;
};

/**
 * Shared page-flip reader (same engine as /revista/[n]/leer).
 * Expects real magazine page paths; supports next/prev + keyboard.
 */
export function FlipReader({
  title,
  number,
  pages,
  onClose,
  className = "",
  closeLabel = "Cerrar",
  showThumbnails = false,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [size, setSize] = useState({ w: 500, h: 700 });
  const [pageRatio, setPageRatio] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = pages.length;
  const safeIndex = clampPageIndex(currentPage, totalPages);
  const displayPage = displayPageNumber(safeIndex, totalPages);

  useEffect(() => {
    if (pages.length === 0) {
      setPageRatio(3 / 4);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalHeight > 0) {
        setPageRatio(img.naturalWidth / img.naturalHeight);
      } else {
        setPageRatio(3 / 4);
      }
    };
    img.onerror = () => setPageRatio(3 / 4);
    img.src = publicUrl(pages[0]!.image_path);
  }, [pages]);

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

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") bookRef.current?.pageFlip()?.flipNext();
      else if (e.key === "ArrowLeft") bookRef.current?.pageFlip()?.flipPrev();
      else if (e.key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else onClose();
      } else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[80] flex flex-col bg-black text-white ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Leyendo ${title}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
        >
          <X className="h-4 w-4" />
          {closeLabel}
        </button>
        <div className="min-w-0 text-center">
          <div className="truncate font-display text-base">{title}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            Rheckypolitan · N.º {String(number).padStart(2, "0")}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="text-white/60 transition hover:text-white"
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Table of contents / page index */}
      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-2 border-b border-white/10 px-5 pb-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
            Índice
          </span>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
            {pages.map((p, i) => (
              <button
                key={`toc-${p.index}`}
                type="button"
                onClick={() => {
                  const pageFlip = bookRef.current?.pageFlip?.();
                  if (pageFlip && typeof pageFlip.flip === "function") {
                    pageFlip.flip(i);
                  } else {
                    setCurrentPage(i);
                  }
                }}
                className={[
                  "min-w-[1.75rem] px-1.5 py-0.5 font-mono text-[10px] tabular-nums transition",
                  safeIndex === i
                    ? "bg-[#B22234] text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/15 hover:text-white",
                ].join(" ")}
                aria-label={`Ir a página ${i + 1}`}
                aria-current={safeIndex === i ? "page" : undefined}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {pageRatio == null ? (
          <div className="font-mono text-xs uppercase tracking-widest text-white/40">Cargando…</div>
        ) : totalPages === 0 ? (
          <div className="px-6 text-center">
            <p className="font-display text-2xl">Sin páginas en este número</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
              Vuelve al estante o abre la ficha del número
            </p>
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFlip={(e: any) => {
              // Same path as unit-tested applyFlipReport against this pages list
              const resolved = applyFlipReport(Number(e.data), pages);
              setCurrentPage(resolved.index);
            }}
          >
            {pages.map((p) => (
              <div
                key={p.index}
                className="relative flex h-full w-full items-center justify-center bg-white"
              >
                <Image
                  src={publicUrl(p.image_path)}
                  alt={`Página ${p.index + 1}`}
                  fill
                  className="object-contain"
                  draggable={false}
                  unoptimized
                />
              </div>
            ))}
          </HTMLFlipBook>
        )}

        {totalPages > 0 && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                bookRef.current?.pageFlip()?.flipPrev();
              }}
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition hover:text-white active:bg-black/70 disabled:opacity-30"
              aria-label="Página anterior"
              disabled={safeIndex <= 0}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                bookRef.current?.pageFlip()?.flipNext();
              }}
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition hover:text-white active:bg-black/70 disabled:opacity-30"
              aria-label="Página siguiente"
              disabled={safeIndex >= totalPages - 1}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-4">
        {showThumbnails && totalPages > 0 && (
          <div
            className="flex w-full max-w-3xl gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
            role="list"
            aria-label="Miniaturas de páginas"
          >
            {pages.map((p, i) => (
              <button
                key={`thumb-${p.index}`}
                type="button"
                role="listitem"
                onClick={() => {
                  const pageFlip = bookRef.current?.pageFlip?.();
                  if (pageFlip && typeof pageFlip.flip === "function") {
                    pageFlip.flip(i);
                  }
                }}
                className={[
                  "relative h-16 w-12 shrink-0 overflow-hidden border transition",
                  safeIndex === i
                    ? "border-[#B22234] ring-1 ring-[#B22234]"
                    : "border-white/15 opacity-70 hover:opacity-100",
                ].join(" ")}
                aria-label={`Miniatura página ${i + 1}`}
              >
                <Image
                  src={publicUrl(p.image_path)}
                  alt=""
                  fill
                  className="object-cover"
                  draggable={false}
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
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
          {totalPages > 0 ? `Página ${displayPage} de ${totalPages}` : "Sin páginas"}
        </div>
      </div>
    </div>
  );
}
