"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { publicUrl } from "@/lib/storage";
import { spinePaletteForIssue, type ShelfIssueInput } from "@/lib/shelf-layout";
import {
  initialShelfState,
  reduceShelfState,
  SHELF_ANIM,
  type ShelfMachineState,
} from "@/lib/shelf-state";
import { FlipReader, type FlipPage } from "@/components/flip-reader";
import { supabase } from "@/integrations/supabase/client";

export type MagazineShelfIssue = ShelfIssueInput;

type Props = {
  issues: MagazineShelfIssue[];
};

type LoadedPages = {
  id: string;
  number: number;
  title: string;
  pages: FlipPage[];
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function formatSpineDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const STORY = [
  {
    kicker: "★ Colección",
    title: "El estante",
    line: "El archivo se arma con el scroll.",
  },
  {
    kicker: "★ Crónicas",
    title: "Desde Kentucky",
    line: "Cada lomo es un número. Cada número, una mesa.",
  },
  {
    kicker: "★ Archivo vivo",
    title: "Papel digital",
    line: "Haz clic en un lomo para sacarlo y hojearlo.",
  },
] as const;

/**
 * El Estante — scroll-cinematic shelf (pinned + scrub).
 * Magazines arrive progressively as you scroll; click opens FlipReader.
 */
export function MagazineShelf({ issues }: Props) {
  const [state, dispatch] = useReducer(
    (s: ShelfMachineState, e: Parameters<typeof reduceShelfState>[1]) => reduceShelfState(s, e),
    initialShelfState,
  );
  const [loaded, setLoaded] = useState<LoadedPages | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [canInteract, setCanInteract] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const plankRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const spineRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const loadGen = useRef(0);
  const timers = useRef<number[]>([]);
  const storyIndexRef = useRef(0);

  const ordered = useMemo(() => [...issues].sort((a, b) => a.number - b.number), [issues]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Timed phase transitions for open/close (reader flow)
  useEffect(() => {
    clearTimers();
    if (state.phase === "exiting") {
      timers.current.push(
        window.setTimeout(() => dispatch({ type: "EXIT_DONE" }), SHELF_ANIM.exitMs),
      );
    } else if (state.phase === "opening") {
      timers.current.push(
        window.setTimeout(() => dispatch({ type: "OPEN_DONE" }), SHELF_ANIM.openMs),
      );
    } else if (state.phase === "closing") {
      timers.current.push(
        window.setTimeout(() => dispatch({ type: "CLOSE_DONE" }), SHELF_ANIM.closeMs),
      );
    }
    return clearTimers;
  }, [state.phase, clearTimers]);

  // Load pages for active issue
  useEffect(() => {
    if (!state.activeId || !state.activeNumber) return;

    const gen = ++loadGen.current;
    let cancelled = false;
    setLoadingPages(true);
    setLoadError(null);
    setLoaded(null);

    const issueMeta = issues.find((i) => i.id === state.activeId);
    const activeNumber = state.activeNumber;
    const activeId = state.activeId;

    (async () => {
      const { data: iss } = await supabase
        .from("issues")
        .select("id,number,title")
        .eq("number", activeNumber)
        .maybeSingle();

      if (cancelled || gen !== loadGen.current) return;

      if (!iss) {
        setLoaded({
          id: activeId,
          number: activeNumber,
          title: issueMeta?.title ?? `N.º ${activeNumber}`,
          pages: [],
        });
        setLoadingPages(false);
        return;
      }

      const { data: pg } = await supabase
        .from("pages")
        .select("index,image_path")
        .eq("issue_id", iss.id)
        .order("index");

      if (cancelled || gen !== loadGen.current) return;

      setLoaded({
        id: activeId,
        number: iss.number,
        title: iss.title,
        pages: (pg as FlipPage[] | null) ?? [],
      });
      setLoadingPages(false);
    })().catch((err) => {
      if (cancelled || gen !== loadGen.current) return;
      setLoadError(err instanceof Error ? err.message : "Error al cargar");
      setLoaded({
        id: activeId,
        number: activeNumber,
        title: issueMeta?.title ?? "",
        pages: [],
      });
      setLoadingPages(false);
    });

    return () => {
      cancelled = true;
    };
  }, [state.activeId, state.activeNumber, issues]);

  useEffect(() => {
    if (state.phase === "idle") {
      setLoaded(null);
      setLoadError(null);
      setLoadingPages(false);
    }
  }, [state.phase]);

  // ─────────────────────────────────────────────
  // Cinematic scroll: pin + scrub magazines in
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!sectionRef.current || !pinRef.current || ordered.length === 0) return;

    let ctx: gsap.Context | undefined;
    let killed = false;

    const setupId = requestAnimationFrame(() => {
      if (killed || !sectionRef.current || !pinRef.current) return;

      const reduced = prefersReducedMotion();
      const spines = ordered
        .map((i) => spineRefs.current.get(i.id))
        .filter(Boolean) as HTMLButtonElement[];

      if (spines.length === 0) return;

      ctx = gsap.context(() => {
        gsap.set(spines, {
          y: reduced ? 0 : 140,
          opacity: reduced ? 1 : 0,
          rotateZ: (i: number) => (reduced ? 0 : i % 2 === 0 ? -12 : 12),
          rotateX: reduced ? 0 : 28,
          scale: reduced ? 1 : 0.82,
          transformOrigin: "50% 100%",
          force3D: true,
        });

        if (plankRef.current) {
          gsap.set(plankRef.current, {
            scaleX: reduced ? 1 : 0.2,
            opacity: reduced ? 1 : 0.35,
            transformOrigin: "50% 50%",
          });
        }
        if (copyRef.current) {
          gsap.set(copyRef.current, { y: reduced ? 0 : 36, opacity: reduced ? 1 : 0 });
        }
        if (countRef.current) {
          gsap.set(countRef.current, {
            opacity: reduced ? 1 : 0,
            y: reduced ? 0 : 20,
          });
        }

        if (reduced) {
          setCanInteract(true);
          return;
        }

        const runway = Math.max(280, 180 + ordered.length * 55);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: `+=${runway}%`,
            pin: pinRef.current,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${p})`;
              }
              const next = p < 0.33 ? 0 : p < 0.7 ? 1 : 2;
              if (next !== storyIndexRef.current) {
                storyIndexRef.current = next;
                setStoryIndex(next);
              }
              const interact = p > 0.28;
              setCanInteract((prev) => (prev === interact ? prev : interact));
            },
          },
        });

        tl.to(copyRef.current, { y: 0, opacity: 1, duration: 0.12, ease: "power2.out" }, 0.02);
        tl.to(countRef.current, { y: 0, opacity: 1, duration: 0.1 }, 0.08);
        if (plankRef.current) {
          tl.to(
            plankRef.current,
            { scaleX: 1, opacity: 1, duration: 0.18, ease: "power2.out" },
            0.05,
          );
        }

        const introEnd = 0.14;
        const settleEnd = 0.88;
        const span = settleEnd - introEnd;

        spines.forEach((el, i) => {
          const t = introEnd + (i / Math.max(spines.length, 1)) * span * 0.72;
          const settle = t + span * 0.18;
          tl.to(
            el,
            {
              y: 0,
              opacity: 1,
              rotateZ: 0,
              rotateX: 0,
              scale: 1,
              duration: 0.14,
              ease: "power3.out",
            },
            t,
          );
          tl.to(el, { y: -6, duration: 0.04, ease: "power1.out" }, settle);
          tl.to(el, { y: 0, duration: 0.05, ease: "power2.inOut" }, settle + 0.04);
        });

        tl.to(shelfRef.current, { rotateX: 2, z: 20, duration: 0.2, ease: "none" }, 0.75);
        tl.to(shelfRef.current, { rotateX: 0, z: 0, duration: 0.15, ease: "none" }, 0.92);
      }, sectionRef);

      ScrollTrigger.refresh();
    });

    return () => {
      killed = true;
      cancelAnimationFrame(setupId);
      ctx?.revert();
    };
  }, [ordered]);

  const selectIssue = useCallback(
    (issue: MagazineShelfIssue) => {
      if (state.phase !== "idle") return;
      dispatch({ type: "SELECT", id: issue.id, number: issue.number });
    },
    [state.phase],
  );

  const dismiss = useCallback(() => {
    dispatch({ type: "DISMISS" });
  }, []);

  const setSpineRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) spineRefs.current.set(id, node);
    else spineRefs.current.delete(id);
  }, []);

  const isBusy = state.phase !== "idle";
  const pagesReady = loaded !== null && state.activeId !== null && loaded.id === state.activeId;
  const showReader = state.phase === "reading" && pagesReady;
  const story = STORY[storyIndex] ?? STORY[0]!;
  const activeIssue = issues.find((i) => i.id === state.activeId);
  const showFly =
    state.phase === "exiting" || state.phase === "opening" || state.phase === "closing";

  return (
    <div
      ref={sectionRef}
      className="relative w-full"
      data-shelf-root
      data-shelf-phase={state.phase}
      data-shelf-cinematic="true"
    >
      <div
        ref={pinRef}
        className="relative flex h-svh min-h-[560px] w-full flex-col overflow-hidden bg-[#0c0a09] text-[#f3ebe0]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "180px 180px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(90,60,40,0.28), transparent 70%), linear-gradient(180deg, #14110f 0%, #0c0a09 55%, #080706 100%)",
          }}
        />

        <div className="relative z-20 flex items-start justify-between gap-4 px-5 pt-8 md:px-10 md:pt-10">
          <div ref={copyRef} className="min-w-0 max-w-2xl">
            <p
              key={`k-${storyIndex}`}
              className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#B22234]"
            >
              {story.kicker}
            </p>
            <h2
              key={`t-${storyIndex}`}
              className="mt-2 font-display text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.92] tracking-tight text-[#f7f0e6]"
            >
              {story.title}
            </h2>
            <p
              key={`l-${storyIndex}`}
              className="mt-4 max-w-md font-display text-lg italic leading-snug text-[#f3ebe0]/65 md:text-xl"
            >
              {story.line}
            </p>
          </div>
          <div ref={countRef} className="shrink-0 text-right">
            <p className="font-display text-5xl tabular-nums leading-none text-white/15 md:text-6xl">
              {String(ordered.length).padStart(2, "0")}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
              en archivo
            </p>
          </div>
        </div>

        <div
          className="relative z-10 flex flex-1 flex-col justify-end px-4 pb-16 sm:px-8 md:px-12 md:pb-20"
          style={{ perspective: "1400px", perspectiveOrigin: "50% 60%" }}
        >
          <div
            ref={shelfRef}
            className="relative mx-auto w-full max-w-[1100px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="flex items-end justify-center gap-[3px] overflow-x-auto px-1 pb-1 pt-10 sm:gap-1.5 sm:overflow-visible md:gap-2"
              style={{
                transformStyle: "preserve-3d",
                minHeight: 220,
                scrollbarWidth: "none",
              }}
            >
              {ordered.map((issue, i) => {
                const palette = spinePaletteForIssue(issue.number);
                const isActive = state.activeId === issue.id;
                const hidden =
                  isActive &&
                  (state.phase === "exiting" ||
                    state.phase === "opening" ||
                    state.phase === "reading" ||
                    state.phase === "closing");
                const dateLabel = formatSpineDate(issue.published_at);
                const num = String(issue.number).padStart(2, "0");
                const h = 168 + ((i * 17) % 36);

                return (
                  <button
                    key={issue.id}
                    type="button"
                    ref={(node) => setSpineRef(issue.id, node)}
                    data-spine
                    data-shelf-issue={issue.number}
                    disabled={isBusy || !canInteract}
                    aria-label={`Abrir N.º ${issue.number}: ${issue.title}`}
                    className={[
                      "group relative shrink-0 outline-none will-change-transform",
                      "focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a09]",
                      "disabled:cursor-default",
                      hidden ? "pointer-events-none !opacity-0" : "",
                    ].join(" ")}
                    style={{
                      width: 20,
                      height: h,
                      transformStyle: "preserve-3d",
                      filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.45))",
                    }}
                    onMouseEnter={(e) => {
                      if (isBusy || !canInteract || prefersReducedMotion()) return;
                      gsap.to(e.currentTarget, {
                        y: -14,
                        z: 36,
                        rotateY: -6,
                        scale: 1.04,
                        duration: 0.4,
                        ease: "power2.out",
                        overwrite: "auto",
                      });
                    }}
                    onMouseLeave={(e) => {
                      if (isBusy) return;
                      gsap.to(e.currentTarget, {
                        y: 0,
                        z: 0,
                        rotateY: 0,
                        scale: 1,
                        duration: 0.5,
                        ease: "power3.out",
                        overwrite: "auto",
                      });
                    }}
                    onClick={() => selectIssue(issue)}
                  >
                    <span
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        background: `linear-gradient(90deg, ${palette.edge} 0%, ${palette.bg} 18%, ${palette.bg} 82%, ${palette.edge} 100%)`,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 w-[38%]"
                        style={{
                          background: "linear-gradient(90deg, rgba(255,255,255,0.14), transparent)",
                        }}
                      />
                      <span
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ background: palette.accent }}
                      />
                      <span
                        className="absolute inset-0 flex flex-col items-center justify-between py-2.5"
                        style={{ color: palette.ink }}
                      >
                        <span
                          className="font-mono text-[6px] font-bold uppercase tracking-[0.16em] opacity-80"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                          }}
                        >
                          RHECKYPOLITAN
                        </span>
                        <span
                          className="max-h-[40%] overflow-hidden font-display text-[9px] leading-none"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                          }}
                          title={issue.title}
                        >
                          {issue.title}
                        </span>
                        <span className="flex flex-col items-center gap-0.5">
                          <span
                            className="font-mono text-[8px] font-bold tabular-nums"
                            style={{ color: palette.accent }}
                          >
                            {num}
                          </span>
                          {dateLabel ? (
                            <span
                              className="font-mono text-[5px] uppercase tracking-wider opacity-60"
                              style={{
                                writingMode: "vertical-rl",
                                transform: "rotate(180deg)",
                              }}
                            >
                              {dateLabel}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className="absolute inset-x-0 bottom-0 h-[16%]"
                        style={{
                          background: `linear-gradient(180deg, transparent, ${palette.accent}bb)`,
                        }}
                      />
                    </span>
                    <span
                      className="pointer-events-none absolute top-[5%] -right-[2px] bottom-[5%] w-[2px]"
                      aria-hidden
                      style={{
                        background: "linear-gradient(180deg, #f5efe4, #e0d4c0 45%, #cfc0a8)",
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div
              ref={plankRef}
              className="relative mx-auto mt-0 h-3 w-full sm:h-3.5"
              style={{
                transformStyle: "preserve-3d",
                transform: "rotateX(14deg)",
                background: "linear-gradient(180deg, #8a7360 0%, #5c4a3c 42%, #3a2e26 100%)",
                boxShadow: "0 18px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
              <div
                className="absolute -bottom-3 inset-x-[4%] h-3"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.5), transparent)",
                  filter: "blur(3px)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 px-5 pb-6 md:px-10">
          <div className="mx-auto flex max-w-[1100px] items-center gap-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
              {state.phase === "idle"
                ? "Scroll · las revistas llegan · clic para abrir"
                : state.phase === "exiting"
                  ? "Sacando del estante…"
                  : state.phase === "opening"
                    ? "Abriendo…"
                    : state.phase === "reading"
                      ? loadingPages || !pagesReady
                        ? "Cargando páginas…"
                        : "Leyendo · Esc cierra"
                      : "Devolviendo…"}
            </p>
            <div className="relative h-px flex-1 overflow-hidden bg-white/10">
              <div
                ref={progressRef}
                className="absolute inset-y-0 left-0 w-full origin-left bg-[#B22234]"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
          {loadError && <p className="mt-2 text-center text-sm text-[#ff8a8a]">{loadError}</p>}
        </div>
      </div>

      {showFly && activeIssue && (
        <div
          className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center"
          data-fly-magazine
          data-fly-phase={state.phase}
        >
          <div
            className={[
              "overflow-hidden border border-[#B22234]/40 bg-[#12100e] shadow-2xl transition-all",
              state.phase === "exiting"
                ? "h-48 w-36 scale-100 opacity-100 duration-500"
                : state.phase === "opening"
                  ? "h-72 w-52 scale-110 opacity-0 duration-500"
                  : "h-40 w-28 scale-75 opacity-0 duration-500",
            ].join(" ")}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            {activeIssue.cover_path ? (
              <img
                src={publicUrl(activeIssue.cover_path)}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#B22234]">
                  N.º {String(activeIssue.number).padStart(2, "0")}
                </span>
                <span className="mt-1 font-display text-sm text-[#f3ebe0]">
                  {activeIssue.title}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {(state.phase === "exiting" || state.phase === "opening" || state.phase === "closing") && (
        <div
          className="pointer-events-none fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]"
          aria-hidden
          data-shelf-backdrop
        />
      )}

      {state.phase === "reading" && !pagesReady && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/85"
          data-shelf-loading
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#B22234]" />
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60">
            Cargando el número…
          </p>
        </div>
      )}

      {showReader && loaded && (
        <FlipReader
          key={`reader-${loaded.id}`}
          title={loaded.title}
          number={loaded.number}
          pages={loaded.pages}
          onClose={dismiss}
        />
      )}
    </div>
  );
}
