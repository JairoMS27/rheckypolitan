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

/** Uniform Rheckypolitan magazine branding */
const MAG = {
  bg: "#111111",
  accent: "#B22234",
  edge: "#000000",
  paper: "#f4f0ea",
} as const;

const STORY = [
  {
    kicker: "★ Colección",
    title: "El estante",
    line: "Las revistas, en fila, listas para salir.",
  },
  {
    kicker: "★ La mesa",
    title: "En orden",
    line: "Bajan una a una y se posan con calma.",
  },
  {
    kicker: "★ Archivo",
    title: "Elige un número",
    line: "Clic en una portada para hojearla.",
  },
] as const;

const SPINE_W = 44;
const SPINE_H = 300;
const COVER_W = 118;
const COVER_H = 158;
const SPINE_GAP = 8;
const TABLE_GAP_X = 18;
const TABLE_GAP_Y = 16;

function shelfPose(i: number, n: number, stageW: number, shelfTop: number): Pose {
  const total = n * SPINE_W + Math.max(0, n - 1) * SPINE_GAP;
  const start = (stageW - total) / 2;
  return {
    x: start + i * (SPINE_W + SPINE_GAP),
    y: shelfTop - SPINE_H,
    w: SPINE_W,
    h: SPINE_H,
    rot: 0,
    z: 10 + i,
  };
}

/**
 * Ordered table layout: neat centered grid, slight alternate tilt.
 * Reads as magazines carefully laid out — not a messy pile.
 */
function tablePose(i: number, n: number, stageW: number, tableCenterY: number): Pose {
  // Prefer a wide row; wrap only when needed
  const maxCols = stageW < 640 ? 3 : stageW < 960 ? 4 : 5;
  const cols = Math.min(n, maxCols);
  const rows = Math.ceil(n / cols);
  // Center incomplete last row
  const row = Math.floor(i / cols);
  const indexInRow = i % cols;
  const itemsInRow = row === rows - 1 ? n - row * cols : cols;

  const gridW = cols * COVER_W + (cols - 1) * TABLE_GAP_X;
  const gridH = rows * COVER_H + (rows - 1) * TABLE_GAP_Y;
  const rowW = itemsInRow * COVER_W + (itemsInRow - 1) * TABLE_GAP_X;

  const originX = (stageW - gridW) / 2;
  const originY = tableCenterY - gridH / 2;
  const rowOriginX = originX + (gridW - rowW) / 2;

  // Tiny ordered tilt (editorial, not chaotic)
  const rot = indexInRow % 2 === 0 ? -1.8 : 1.8;

  return {
    x: rowOriginX + indexInRow * (COVER_W + TABLE_GAP_X),
    y: originY + row * (COVER_H + TABLE_GAP_Y),
    w: COVER_W,
    h: COVER_H,
    rot,
    z: 30 + row * 10 + indexInRow,
  };
}

/**
 * El Estante — white cinematic shelf → ordered table layout.
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
  const shelfUnitRef = useRef<HTMLDivElement>(null);
  const tableUnitRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const magRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const loadGen = useRef(0);
  const timers = useRef<number[]>([]);
  const storyIndexRef = useRef(0);

  // Chronological order on shelf & table (N.º 01 → …)
  const ordered = useMemo(() => [...issues].sort((a, b) => a.number - b.number), [issues]);

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
  // Scroll: ordered shelf → ordered table grid
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
      const n = ordered.length;
      const reduced = prefersReducedMotion();

      // Geometry: shelf in upper third, table in lower half
      const shelfTop = stageH * 0.38;
      const tableCenterY = stageH * 0.68;

      const mags = ordered
        .map((issue) => {
          const el = magRefs.current.get(issue.id);
          return el ? { issue, el } : null;
        })
        .filter(Boolean) as { issue: MagazineShelfIssue; el: HTMLButtonElement }[];

      if (mags.length === 0) return;

      // Size furniture to content
      const shelfContentW = n * SPINE_W + Math.max(0, n - 1) * SPINE_GAP;
      const shelfW = Math.min(stageW - 48, Math.max(shelfContentW + 100, 420));
      const shelfH = 28;

      if (shelfUnitRef.current) {
        gsap.set(shelfUnitRef.current, {
          left: (stageW - shelfW) / 2,
          top: shelfTop - 4,
          width: shelfW,
          height: shelfH + 36,
        });
      }

      const maxCols = stageW < 640 ? 3 : stageW < 960 ? 4 : 5;
      const cols = Math.min(n, maxCols);
      const rows = Math.ceil(n / cols);
      const tableW = Math.min(
        stageW - 40,
        Math.max(cols * COVER_W + (cols - 1) * TABLE_GAP_X + 100, 380),
      );
      const tableH = Math.max(rows * COVER_H + (rows - 1) * TABLE_GAP_Y + 80, 220);

      if (tableUnitRef.current) {
        gsap.set(tableUnitRef.current, {
          left: (stageW - tableW) / 2,
          top: tableCenterY - tableH * 0.42,
          width: tableW,
          height: tableH,
          opacity: reduced ? 1 : 0,
        });
      }

      mags.forEach(({ el }, i) => {
        const from = shelfPose(i, n, stageW, shelfTop);
        gsap.set(el, {
          left: from.x,
          top: from.y,
          width: from.w,
          height: from.h,
          rotation: from.rot,
          zIndex: from.z,
          opacity: 1,
          force3D: true,
          boxShadow: "2px 8px 16px rgba(0,0,0,0.2)",
        });
        const spine = el.querySelector<HTMLElement>("[data-face=spine]");
        const cover = el.querySelector<HTMLElement>("[data-face=cover]");
        if (spine) gsap.set(spine, { opacity: 1 });
        if (cover) gsap.set(cover, { opacity: 0 });
      });

      ctx = gsap.context(() => {
        if (reduced) {
          mags.forEach(({ el }, i) => {
            const to = tablePose(i, n, stageW, tableCenterY);
            gsap.set(el, {
              left: to.x,
              top: to.y,
              width: to.w,
              height: to.h,
              rotation: to.rot,
              zIndex: to.z,
              boxShadow: "0 14px 28px rgba(0,0,0,0.16)",
            });
            const spine = el.querySelector<HTMLElement>("[data-face=spine]");
            const cover = el.querySelector<HTMLElement>("[data-face=cover]");
            if (spine) gsap.set(spine, { opacity: 0 });
            if (cover) gsap.set(cover, { opacity: 1 });
          });
          if (tableUnitRef.current) gsap.set(tableUnitRef.current, { opacity: 1 });
          if (shelfUnitRef.current) gsap.set(shelfUnitRef.current, { opacity: 0.4 });
          setOnTable(true);
          setStoryIndex(2);
          return;
        }

        const runway = Math.max(280, 210 + n * 45);

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
              const next = p < 0.25 ? 0 : p < 0.7 ? 1 : 2;
              if (next !== storyIndexRef.current) {
                storyIndexRef.current = next;
                setStoryIndex(next);
              }
              setOnTable((prev) => {
                const v = p > 0.58;
                return prev === v ? prev : v;
              });
            },
          },
        });

        // Table rises into view
        if (tableUnitRef.current) {
          gsap.set(tableUnitRef.current, { y: 40 });
          tl.to(tableUnitRef.current, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, 0.1);
        }

        // Magazines leave left → right in strict order
        mags.forEach(({ el }, i) => {
          const from = shelfPose(i, n, stageW, shelfTop);
          const to = tablePose(i, n, stageW, tableCenterY);
          // Sequential stagger: each waits for previous to be mid-flight
          const slot = 0.14 + (i / Math.max(n, 1)) * 0.52;
          const liftT = slot;
          const flyT = slot + 0.07;
          const landT = slot + 0.2;

          const spine = el.querySelector<HTMLElement>("[data-face=spine]");
          const cover = el.querySelector<HTMLElement>("[data-face=cover]");

          // 1. Pull straight out from shelf (no random wobble)
          tl.to(
            el,
            {
              top: from.y - 56,
              left: from.x,
              rotation: 0,
              zIndex: 50 + i,
              boxShadow: "0 22px 40px rgba(0,0,0,0.22)",
              duration: 0.07,
              ease: "power2.out",
            },
            liftT,
          );

          // 2. Transform to cover size while flying to grid seat
          tl.to(
            el,
            {
              left: to.x,
              top: to.y - 10,
              width: to.w,
              height: to.h,
              rotation: to.rot * 0.5,
              zIndex: to.z + 20,
              duration: 0.16,
              ease: "power2.inOut",
            },
            flyT,
          );

          if (spine) tl.to(spine, { opacity: 0, duration: 0.08 }, flyT + 0.03);
          if (cover) tl.to(cover, { opacity: 1, duration: 0.08 }, flyT + 0.04);

          // 3. Settle flat on the table, final rotation
          tl.to(
            el,
            {
              top: to.y,
              rotation: to.rot,
              zIndex: to.z,
              boxShadow: "0 12px 26px rgba(0,0,0,0.14), 0 2px 4px rgba(0,0,0,0.06)",
              duration: 0.07,
              ease: "power2.out",
            },
            landT,
          );
        });

        // Empty shelf fades back (still visible as furniture)
        if (shelfUnitRef.current) {
          tl.to(shelfUnitRef.current, { opacity: 0.45, y: -8, duration: 0.18 }, 0.55);
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
      data-shelf-cinematic="table-grid"
    >
      <div
        ref={pinRef}
        className="relative flex h-svh min-h-[640px] w-full flex-col overflow-hidden bg-background text-foreground"
      >
        {/* Soft studio light */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(0,0,0,0.03), transparent 60%), linear-gradient(180deg, #fafafa 0%, #ffffff 40%, #f5f3ef 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "220px 220px",
          }}
        />

        {/* Header */}
        <div className="relative z-20 flex items-start justify-between gap-4 px-5 pt-8 md:px-12 md:pt-11">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#B22234]">
              {story.kicker}
            </p>
            <h2 className="mt-2 font-display text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.92] tracking-tight">
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

        {/* Stage */}
        <div ref={stageRef} className="relative z-10 min-h-0 w-full flex-1">
          {/* ─── Premium wall shelf ─── */}
          <div
            ref={shelfUnitRef}
            className="pointer-events-none absolute"
            aria-hidden
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Wall wash behind shelf */}
            <div
              className="absolute -inset-x-8 -top-16 bottom-2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 40%, transparent 100%)",
              }}
            />

            {/* Metal brackets */}
            <div
              className="absolute bottom-7 left-6 h-10 w-2.5"
              style={{
                background: "linear-gradient(90deg, #9a9a9a 0%, #d0d0d0 40%, #8a8a8a 100%)",
                boxShadow: "1px 2px 4px rgba(0,0,0,0.15)",
                clipPath: "polygon(0 0, 100% 0, 100% 70%, 55% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute bottom-7 right-6 h-10 w-2.5"
              style={{
                background: "linear-gradient(90deg, #9a9a9a 0%, #d0d0d0 40%, #8a8a8a 100%)",
                boxShadow: "1px 2px 4px rgba(0,0,0,0.15)",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 45% 100%, 0 70%)",
              }}
            />

            {/* Thick oak plank */}
            <div
              className="absolute bottom-5 left-0 right-0 h-5 overflow-hidden"
              style={{
                background: `
                  linear-gradient(180deg,
                    #e8dcc8 0%,
                    #d4c4a8 18%,
                    #c4b08c 45%,
                    #b09a78 72%,
                    #9a8464 100%
                  )
                `,
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.45) inset, 0 -2px 0 rgba(0,0,0,0.12) inset, 0 10px 24px rgba(40,30,15,0.18)",
                borderRadius: "1px",
              }}
            >
              {/* Wood grain lines */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      90deg,
                      transparent 0px,
                      transparent 11px,
                      rgba(80,55,30,0.07) 11px,
                      rgba(80,55,30,0.07) 12px
                    ),
                    repeating-linear-gradient(
                      0deg,
                      transparent 0px,
                      transparent 3px,
                      rgba(255,255,255,0.04) 3px,
                      rgba(255,255,255,0.04) 4px
                    )
                  `,
                }}
              />
              {/* Top highlight edge */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            {/* Front lip (depth) */}
            <div
              className="absolute bottom-2 left-0 right-0 h-3"
              style={{
                background: "linear-gradient(180deg, #a89070 0%, #8a7458 55%, #6e5a42 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            />

            {/* Cast shadow under shelf */}
            <div
              className="absolute -bottom-1 left-4 right-4 h-4"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.18), transparent 70%)",
                filter: "blur(3px)",
              }}
            />
          </div>

          {/* ─── Premium table ─── */}
          <div ref={tableUnitRef} className="pointer-events-none absolute" aria-hidden>
            {/* Floor contact shadow */}
            <div
              className="absolute -bottom-3 left-[8%] right-[8%] h-8"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.14), transparent 68%)",
                filter: "blur(6px)",
              }}
            />

            {/* Table top — walnut-ish editorial surface */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: "4px 4px 6px 6px",
                background: `
                  linear-gradient(165deg,
                    #c4a882 0%,
                    #b8956e 22%,
                    #a67c52 48%,
                    #8f6844 72%,
                    #7a5738 100%
                  )
                `,
                boxShadow: `
                  0 1px 0 rgba(255,255,255,0.25) inset,
                  0 -8px 16px rgba(0,0,0,0.12) inset,
                  0 28px 50px rgba(40,25,10,0.18),
                  0 8px 16px rgba(0,0,0,0.08)
                `,
                transform: "perspective(1200px) rotateX(52deg)",
                transformOrigin: "50% 50%",
              }}
            >
              {/* Grain */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      92deg,
                      transparent 0px,
                      transparent 18px,
                      rgba(60,35,15,0.06) 18px,
                      rgba(60,35,15,0.06) 19px
                    ),
                    repeating-linear-gradient(
                      0deg,
                      transparent 0px,
                      transparent 5px,
                      rgba(255,240,220,0.03) 5px,
                      rgba(255,240,220,0.03) 6px
                    )
                  `,
                }}
              />
              {/* Soft center highlight */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 55% 40% at 50% 35%, rgba(255,255,255,0.14), transparent 70%)",
                }}
              />
              {/* Edge rim */}
              <div
                className="absolute inset-x-0 bottom-0 h-2"
                style={{
                  background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.25))",
                }}
              />
              {/* Vignette corners */}
              <div
                className="absolute inset-0"
                style={{
                  boxShadow: "inset 0 0 60px rgba(40,20,5,0.2)",
                }}
              />
            </div>

            {/* Front apron under table */}
            <div
              className="absolute bottom-0 left-[6%] right-[6%] h-3"
              style={{
                background: "linear-gradient(180deg, #6a4a30 0%, #4a3220 100%)",
                borderRadius: "0 0 2px 2px",
                boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
                opacity: 0.85,
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
                  "transition-[filter] duration-200 hover:brightness-[1.03]",
                  hidden ? "pointer-events-none !opacity-0" : "",
                ].join(" ")}
                style={{
                  left: 0,
                  top: 0,
                  width: SPINE_W,
                  height: SPINE_H,
                  borderRadius: onTable ? 1 : 0,
                }}
                onClick={() => selectIssue(issue)}
              >
                {/* Spine */}
                <span
                  data-face="spine"
                  className="absolute inset-0 flex flex-col"
                  style={{
                    background: `linear-gradient(90deg, ${MAG.edge} 0%, ${MAG.bg} 12%, #1c1c1c 50%, ${MAG.bg} 88%, ${MAG.edge} 100%)`,
                  }}
                >
                  <span
                    className="flex h-11 shrink-0 items-center justify-center"
                    style={{ background: MAG.accent }}
                  >
                    <span
                      className="font-mono text-[12px] font-bold tabular-nums text-white"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      {num}
                    </span>
                  </span>
                  <span className="flex min-h-0 flex-1 flex-col items-center justify-between px-0.5 py-3">
                    <span
                      className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white/90"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      RHECKYPOLITAN
                    </span>
                    <span
                      className="max-h-[46%] overflow-hidden font-display text-[11px] leading-none text-white/85"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      title={issue.title}
                    >
                      {issue.title}
                    </span>
                    <span
                      className="font-mono text-[7px] uppercase tracking-widest text-white/40"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      REVISTA
                    </span>
                  </span>
                  <span className="h-2.5 shrink-0" style={{ background: MAG.accent }} />
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-[32%]"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.13), transparent)",
                    }}
                  />
                  <span
                    className="pointer-events-none absolute top-[7%] -right-[3px] bottom-[7%] w-[3px]"
                    style={{
                      background: `linear-gradient(180deg, ${MAG.paper}, #e8e0d4 50%, #d4c9b8)`,
                      boxShadow: "1px 0 2px rgba(0,0,0,0.12)",
                    }}
                  />
                </span>

                {/* Cover */}
                <span
                  data-face="cover"
                  className="absolute inset-0 flex flex-col bg-foreground opacity-0"
                  style={{ border: "1px solid rgba(0,0,0,0.08)" }}
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
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 pt-8">
                    <span className="font-mono text-[9px] font-bold tabular-nums text-white">
                      N.º {num}
                    </span>
                  </span>
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)",
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
                  ? "En la mesa · clic para abrir"
                  : "Scroll · salen en orden hacia la mesa"
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
