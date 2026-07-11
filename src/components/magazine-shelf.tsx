"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { publicUrl } from "@/lib/storage";
import type { ShelfIssueInput } from "@/lib/shelf-layout";
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

type Pose = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Uniform Rheckypolitan magazine branding (all issues share the same spine). */
const MAG = {
  bg: "#111111",
  ink: "#ffffff",
  accent: "#B22234",
  edge: "#000000",
  paper: "#f4f0ea",
} as const;

const STORY = [
  {
    kicker: "★ Colección",
    title: "El estante",
    line: "Todas las revistas, listas en el lomo.",
  },
  {
    kicker: "★ La mesa",
    title: "Se despliegan",
    line: "Salen del estante y caen en espiral.",
  },
  {
    kicker: "★ Archivo",
    title: "Elige un número",
    line: "Clic en una revista para hojearla.",
  },
] as const;

const SPINE_W = 42;
const SPINE_H = 320;
const COVER_W = 128;
const COVER_H = 172;
const SPINE_GAP = 10;

function shelfPose(i: number, n: number, stageW: number, shelfY: number): Pose {
  const total = n * SPINE_W + Math.max(0, n - 1) * SPINE_GAP;
  const start = (stageW - total) / 2;
  return {
    x: start + i * (SPINE_W + SPINE_GAP),
    y: shelfY - SPINE_H,
    w: SPINE_W,
    h: SPINE_H,
    rot: 0,
    z: i,
  };
}

/** Archimedean-ish spiral on the table (flattened for screen). */
function spiralPose(i: number, n: number, stageW: number, tableCy: number): Pose {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const angle = i * golden - Math.PI / 2;
  // Radius grows so the stack reads as a spiral spread
  const t = n <= 1 ? 0 : i / (n - 1);
  const radius = 36 + t * Math.min(stageW * 0.34, 220);
  const cx = stageW / 2;
  const x = cx + Math.cos(angle) * radius - COVER_W / 2;
  const y = tableCy + Math.sin(angle) * radius * 0.62 - COVER_H / 2;
  const rot = ((angle * 180) / Math.PI) * 0.35 + (i % 3) * 4 - 4;
  return {
    x,
    y,
    w: COVER_W,
    h: COVER_H,
    rot,
    z: 20 + i,
  };
}

/**
 * El Estante — white cinematic shelf.
 * Magazines start on a large shelf; scroll pulls them onto a spiral table layout.
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
  const [onTable, setOnTable] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shelfBoardRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const magRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const loadGen = useRef(0);
  const timers = useRef<number[]>([]);
  const storyIndexRef = useRef(0);

  // Newest first on the shelf (left → right archive order by number desc)
  const ordered = useMemo(() => [...issues].sort((a, b) => b.number - a.number), [issues]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

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
  // Scroll: shelf → spiral table
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!sectionRef.current || !pinRef.current || !stageRef.current || ordered.length === 0) {
      return;
    }

    let ctx: gsap.Context | undefined;
    let killed = false;

    const setupId = requestAnimationFrame(() => {
      if (killed || !sectionRef.current || !pinRef.current || !stageRef.current) return;

      const stage = stageRef.current;
      const stageW = stage.clientWidth || 1000;
      const stageH = stage.clientHeight || 600;
      const shelfY = stageH * 0.42;
      const tableCy = stageH * 0.62;
      const n = ordered.length;
      const reduced = prefersReducedMotion();

      const mags = ordered
        .map((issue) => {
          const el = magRefs.current.get(issue.id);
          return el ? { issue, el } : null;
        })
        .filter(Boolean) as { issue: MagazineShelfIssue; el: HTMLButtonElement }[];

      if (mags.length === 0) return;

      // Position shelf board + table surface
      if (shelfBoardRef.current) {
        const total = n * SPINE_W + Math.max(0, n - 1) * SPINE_GAP;
        const boardW = Math.min(stageW - 32, Math.max(total + 80, 320));
        gsap.set(shelfBoardRef.current, {
          left: (stageW - boardW) / 2,
          top: shelfY,
          width: boardW,
        });
      }
      if (tableRef.current) {
        const tw = Math.min(stageW * 0.88, 720);
        const th = Math.min(stageH * 0.42, 340);
        gsap.set(tableRef.current, {
          left: (stageW - tw) / 2,
          top: tableCy - th * 0.35,
          width: tw,
          height: th,
          opacity: reduced ? 0.9 : 0,
        });
      }

      // Initial shelf poses
      mags.forEach(({ el }, i) => {
        const from = shelfPose(i, n, stageW, shelfY);
        gsap.set(el, {
          left: from.x,
          top: from.y,
          width: from.w,
          height: from.h,
          rotation: from.rot,
          zIndex: from.z,
          opacity: 1,
          force3D: true,
        });
        const spine = el.querySelector<HTMLElement>("[data-face=spine]");
        const cover = el.querySelector<HTMLElement>("[data-face=cover]");
        if (spine) gsap.set(spine, { opacity: 1 });
        if (cover) gsap.set(cover, { opacity: 0 });
      });

      ctx = gsap.context(() => {
        if (reduced) {
          mags.forEach(({ el }, i) => {
            const to = spiralPose(i, n, stageW, tableCy);
            gsap.set(el, {
              left: to.x,
              top: to.y,
              width: to.w,
              height: to.h,
              rotation: to.rot,
              zIndex: to.z,
            });
            const spine = el.querySelector<HTMLElement>("[data-face=spine]");
            const cover = el.querySelector<HTMLElement>("[data-face=cover]");
            if (spine) gsap.set(spine, { opacity: 0 });
            if (cover) gsap.set(cover, { opacity: 1 });
          });
          if (tableRef.current) gsap.set(tableRef.current, { opacity: 0.95 });
          setOnTable(true);
          setStoryIndex(2);
          return;
        }

        const runway = Math.max(260, 200 + n * 40);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: `+=${runway}%`,
            pin: pinRef.current,
            scrub: 0.9,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${p})`;
              }
              const next = p < 0.28 ? 0 : p < 0.68 ? 1 : 2;
              if (next !== storyIndexRef.current) {
                storyIndexRef.current = next;
                setStoryIndex(next);
              }
              setOnTable((prev) => {
                const nextOn = p > 0.55;
                return prev === nextOn ? prev : nextOn;
              });
            },
          },
        });

        // Table fades in mid-sequence
        if (tableRef.current) {
          tl.to(tableRef.current, { opacity: 0.95, duration: 0.25 }, 0.18);
        }

        // Each magazine leaves the shelf toward its spiral seat
        mags.forEach(({ el }, i) => {
          const from = shelfPose(i, n, stageW, shelfY);
          const to = spiralPose(i, n, stageW, tableCy);
          // Stagger departures left→right, then arc through air
          const start = 0.12 + (i / Math.max(n, 1)) * 0.48;
          const lift = start + 0.08;
          const land = start + 0.22;

          const spine = el.querySelector<HTMLElement>("[data-face=spine]");
          const cover = el.querySelector<HTMLElement>("[data-face=cover]");

          // Pull out / lift
          tl.to(
            el,
            {
              top: from.y - 48 - (i % 3) * 8,
              left: from.x + (i - n / 2) * 6,
              rotation: i % 2 === 0 ? -8 : 8,
              zIndex: 40 + i,
              duration: 0.08,
              ease: "power1.out",
            },
            start,
          );

          // Morph to cover + spiral land
          tl.to(
            el,
            {
              left: to.x,
              top: to.y,
              width: to.w,
              height: to.h,
              rotation: to.rot,
              zIndex: to.z,
              duration: 0.2,
              ease: "power2.inOut",
            },
            lift,
          );

          if (spine) {
            tl.to(spine, { opacity: 0, duration: 0.1 }, lift + 0.04);
          }
          if (cover) {
            tl.to(cover, { opacity: 1, duration: 0.1 }, lift + 0.05);
          }

          // Soft settle
          tl.to(
            el,
            {
              top: to.y + 4,
              duration: 0.04,
              ease: "power1.in",
            },
            land,
          );
          tl.to(
            el,
            {
              top: to.y,
              duration: 0.05,
              ease: "power2.out",
            },
            land + 0.04,
          );
        });

        // Shelf board recedes slightly once magazines leave
        if (shelfBoardRef.current) {
          tl.to(shelfBoardRef.current, { opacity: 0.35, y: -12, duration: 0.2 }, 0.55);
        }
      }, sectionRef);

      ScrollTrigger.refresh();
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      killed = true;
      cancelAnimationFrame(setupId);
      window.removeEventListener("resize", onResize);
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

  const setMagRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) magRefs.current.set(id, node);
    else magRefs.current.delete(id);
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
      className="relative w-full bg-background"
      data-shelf-root
      data-shelf-phase={state.phase}
      data-shelf-cinematic="spiral"
    >
      <div
        ref={pinRef}
        className="relative flex h-svh min-h-[620px] w-full flex-col overflow-hidden bg-background text-foreground"
      >
        {/* Subtle paper grain on white */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />

        {/* Header copy */}
        <div className="relative z-20 flex items-start justify-between gap-4 px-5 pt-8 md:px-12 md:pt-12">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#B22234]">
              {story.kicker}
            </p>
            <h2 className="mt-2 font-display text-[clamp(2.75rem,8vw,5.75rem)] font-semibold leading-[0.92] tracking-tight">
              {story.title}
            </h2>
            <p className="mt-3 max-w-md font-display text-lg italic leading-snug text-muted-foreground md:text-xl">
              {story.line}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-5xl tabular-nums leading-none text-foreground/10 md:text-6xl">
              {String(ordered.length).padStart(2, "0")}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              revistas
            </p>
          </div>
        </div>

        {/* Stage: shelf + table + magazines (absolute) */}
        <div ref={stageRef} className="relative z-10 min-h-0 flex-1 w-full">
          {/* Table surface (mesa) */}
          <div
            ref={tableRef}
            className="pointer-events-none absolute rounded-sm"
            style={{
              background: "linear-gradient(180deg, #ebe4d8 0%, #e0d6c6 40%, #d2c6b2 100%)",
              boxShadow: "0 24px 48px rgba(40,30,15,0.12), inset 0 1px 0 rgba(255,255,255,0.55)",
              transform: "perspective(900px) rotateX(58deg)",
              transformOrigin: "50% 50%",
            }}
            aria-hidden
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(90,60,30,0.04) 14px, rgba(90,60,30,0.04) 15px)",
              }}
            />
          </div>

          {/* Shelf board */}
          <div
            ref={shelfBoardRef}
            className="pointer-events-none absolute h-4 sm:h-5"
            style={{
              background: "linear-gradient(180deg, #d9cbb6 0%, #c4b49a 45%, #a89478 100%)",
              boxShadow: "0 12px 28px rgba(60,40,20,0.16), inset 0 1px 0 rgba(255,255,255,0.6)",
              transform: "perspective(800px) rotateX(12deg)",
              transformOrigin: "50% 0%",
            }}
            aria-hidden
          >
            <div className="absolute inset-x-0 top-0 h-px bg-white/70" />
            <div
              className="absolute -bottom-2 inset-x-[3%] h-2"
              style={{
                background: "linear-gradient(180deg, rgba(60,40,20,0.18), transparent)",
                filter: "blur(2px)",
              }}
            />
          </div>

          {/* Magazines */}
          {ordered.map((issue) => {
            const isActive = state.activeId === issue.id;
            const hidden =
              isActive &&
              (state.phase === "exiting" ||
                state.phase === "opening" ||
                state.phase === "reading" ||
                state.phase === "closing");
            const num = String(issue.number).padStart(2, "0");
            const cover = issue.cover_path ? publicUrl(issue.cover_path) : null;

            return (
              <button
                key={issue.id}
                type="button"
                ref={(node) => setMagRef(issue.id, node)}
                data-mag
                data-shelf-issue={issue.number}
                disabled={isBusy}
                aria-label={`Abrir N.º ${issue.number}: ${issue.title}`}
                className={[
                  "absolute overflow-hidden outline-none will-change-[left,top,width,height,transform]",
                  "focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2",
                  "disabled:cursor-default",
                  "hover:brightness-105",
                  hidden ? "pointer-events-none !opacity-0" : "",
                ].join(" ")}
                style={{
                  left: 0,
                  top: 0,
                  width: SPINE_W,
                  height: SPINE_H,
                  boxShadow: onTable
                    ? "0 16px 32px rgba(0,0,0,0.18)"
                    : "0 10px 22px rgba(0,0,0,0.22)",
                }}
                onClick={() => selectIssue(issue)}
              >
                {/* Spine face — magazine lomo, same brand for all */}
                <span
                  data-face="spine"
                  className="absolute inset-0 flex flex-col"
                  style={{
                    background: `linear-gradient(90deg, ${MAG.edge} 0%, ${MAG.bg} 14%, #1a1a1a 50%, ${MAG.bg} 86%, ${MAG.edge} 100%)`,
                  }}
                >
                  {/* Top issue band */}
                  <span
                    className="flex h-10 shrink-0 items-center justify-center"
                    style={{ background: MAG.accent }}
                  >
                    <span
                      className="font-mono text-[11px] font-bold tabular-nums text-white"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {num}
                    </span>
                  </span>

                  {/* Brand + title stack */}
                  <span className="flex min-h-0 flex-1 flex-col items-center justify-between px-0.5 py-3">
                    <span
                      className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/90"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        letterSpacing: "0.18em",
                      }}
                    >
                      RHECKYPOLITAN
                    </span>
                    <span
                      className="max-h-[48%] overflow-hidden font-display text-[11px] leading-none text-white/85"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                      title={issue.title}
                    >
                      {issue.title}
                    </span>
                    <span
                      className="font-mono text-[7px] uppercase tracking-widest text-white/45"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      REVISTA
                    </span>
                  </span>

                  {/* Bottom red strip */}
                  <span className="h-3 shrink-0" style={{ background: MAG.accent }} />

                  {/* Gloss */}
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)",
                    }}
                  />
                  {/* Thin paper edge (magazine pages) */}
                  <span
                    className="pointer-events-none absolute top-[8%] -right-[3px] bottom-[8%] w-[3px]"
                    style={{
                      background: `linear-gradient(180deg, ${MAG.paper}, #e8e0d4 50%, #d4c9b8)`,
                      boxShadow: "1px 0 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </span>

                {/* Cover face — shown on the table */}
                <span
                  data-face="cover"
                  className="absolute inset-0 flex flex-col bg-foreground opacity-0"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="flex h-full flex-col justify-between bg-[#111] p-3 text-left">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#B22234]">
                        Rheckypolitan
                      </span>
                      <span>
                        <span className="font-display text-3xl text-white">{num}</span>
                        <span className="mt-1 block font-display text-sm leading-tight text-white/80">
                          {issue.title}
                        </span>
                      </span>
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                    <span className="font-mono text-[9px] font-bold tabular-nums text-white">
                      N.º {num}
                    </span>
                  </span>
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.14), transparent)",
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div className="relative z-20 px-5 pb-6 md:px-12">
          <div className="mx-auto flex max-w-[1100px] items-center gap-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              {state.phase === "idle"
                ? onTable
                  ? "Sobre la mesa · clic para abrir"
                  : "Scroll · las revistas salen del estante"
                : state.phase === "exiting"
                  ? "Sacando…"
                  : state.phase === "opening"
                    ? "Abriendo…"
                    : state.phase === "reading"
                      ? loadingPages || !pagesReady
                        ? "Cargando páginas…"
                        : "Leyendo · Esc cierra"
                      : "Devolviendo…"}
            </p>
            <div className="relative h-px flex-1 overflow-hidden bg-foreground/10">
              <div
                ref={progressRef}
                className="absolute inset-y-0 left-0 w-full origin-left bg-[#B22234]"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
          {loadError && <p className="mt-2 text-center text-sm text-[#B22234]">{loadError}</p>}
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
              "overflow-hidden border border-[#B22234]/40 bg-foreground shadow-2xl transition-all",
              state.phase === "exiting"
                ? "h-56 w-40 scale-100 opacity-100 duration-500"
                : state.phase === "opening"
                  ? "h-80 w-56 scale-110 opacity-0 duration-500"
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
              <div className="flex h-full flex-col items-center justify-center px-2 text-center text-background">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#B22234]">
                  N.º {String(activeIssue.number).padStart(2, "0")}
                </span>
                <span className="mt-1 font-display text-sm">{activeIssue.title}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(state.phase === "exiting" || state.phase === "opening" || state.phase === "closing") && (
        <div
          className="pointer-events-none fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]"
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
