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
};

/**
 * Shared page-flip reader (same engine as /revista/[n]/leer).
 * Expects real magazine page paths; supports next/prev + keyboard.
 */
export function FlipReader({ title, number, pages, onClose, className = "" }: Props) {
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
      <div className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition-colors duration-150 ease-out hover:text-white active:scale-[0.96]"
        >
          <X className="h-4 w-4" />
          Cerrar
        </button>
        <div className="text-center">
          <div className="font-display text-base">{title}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            Rheckypolitan · N.º {String(number).padStart(2, "0")}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="relative flex min-h-10 min-w-10 items-center justify-center text-white/60 transition-colors duration-150 ease-out hover:text-white active:scale-[0.96]"
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

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
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition-[color,background-color,transform] duration-150 ease-out hover:text-white active:scale-[0.96] active:bg-black/70 disabled:opacity-30"
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
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur transition-[color,background-color,transform] duration-150 ease-out hover:text-white active:scale-[0.96] active:bg-black/70 disabled:opacity-30"
              aria-label="Página siguiente"
              disabled={safeIndex >= totalPages - 1}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

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
          {totalPages > 0 ? `Página ${displayPage} de ${totalPages}` : "Sin páginas"}
        </div>
      </div>
    </div>
  );
}
