"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { publicUrl } from "@/lib/storage";
import {
  groupSlotsByRow,
  layoutShelfIssues,
  spinePaletteForIssue,
  type ShelfIssueInput,
} from "@/lib/shelf-layout";
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

type FlyState = {
  issue: MagazineShelfIssue;
  from: DOMRect;
  coverUrl: string | null;
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

/**
 * El Estante — premium CSS-3D spine shelf with GSAP extract / scroll physics
 * and shared FlipReader (react-pageflip).
 */
export function MagazineShelf({ issues }: Props) {
  const [state, dispatch] = useReducer(
    (s: ShelfMachineState, e: Parameters<typeof reduceShelfState>[1]) => reduceShelfState(s, e),
    initialShelfState,
  );
  const [loaded, setLoaded] = useState<LoadedPages | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [fly, setFly] = useState<FlyState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const coverFlapRef = useRef<HTMLDivElement>(null);
  const spineRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const loadGen = useRef(0);
  const animating = useRef(false);
  const timers = useRef<number[]>([]);

  const layout = useMemo(() => layoutShelfIssues(issues, 8), [issues]);
  const rows = useMemo(() => groupSlotsByRow(layout), [layout]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Load magazine pages when active
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
      setFly(null);
      animating.current = false;
    }
  }, [state.phase]);

  // ScrollTrigger: soft cascade / parallax on spines (disabled in immersive)
  useEffect(() => {
    if (!rootRef.current || issues.length === 0 || immersive || prefersReducedMotion()) {
      return;
    }

    const ctx = gsap.context(() => {
      const spines = rootRef.current!.querySelectorAll<HTMLElement>("[data-spine]");
      spines.forEach((el, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.fromTo(
          el,
          { rotateZ: dir * -2.5, y: -6, transformOrigin: "50% 100%" },
          {
            rotateZ: dir * 3.5,
            y: 10,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 75%",
              end: "bottom 25%",
              scrub: 0.85,
            },
          },
        );
      });

      gsap.fromTo(
        rootRef.current!.querySelectorAll("[data-shelf-plank]"),
        { rotateX: 8 },
        {
          rotateX: 0,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 80%",
            end: "center center",
            scrub: true,
          },
        },
      );
    }, rootRef);

    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [issues, layout.rows, immersive]);

  // Extract / open GSAP timeline
  useEffect(() => {
    if (state.phase !== "exiting" || !fly || !flyRef.current) return;

    animating.current = true;
    const el = flyRef.current;
    const flap = coverFlapRef.current;
    const reduced = prefersReducedMotion();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const from = fly.from;

    const coverW = Math.min(280, vw * 0.42);
    const coverH = coverW * 1.38;
    const targetX = vw / 2 - coverW / 2;
    const targetY = vh / 2 - coverH / 2 - 20;

    gsap.set(el, {
      position: "fixed",
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      zIndex: 90,
      transformOrigin: "50% 50%",
      rotateY: -8,
      rotateX: 4,
      rotateZ: -4,
      scale: 1,
      opacity: 1,
      force3D: true,
    });

    if (flap) {
      gsap.set(flap, { rotateY: 0, transformOrigin: "left center" });
    }

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        dispatch({ type: "EXIT_DONE" });
        timers.current.push(
          window.setTimeout(
            () => {
              dispatch({ type: "OPEN_DONE" });
              animating.current = false;
            },
            reduced ? 80 : SHELF_ANIM.openMs * 0.35,
          ),
        );
      },
    });

    if (reduced) {
      tl.to(el, {
        left: targetX,
        top: targetY,
        width: coverW,
        height: coverH,
        rotateY: 0,
        rotateX: 0,
        rotateZ: 0,
        duration: 0.2,
      });
    } else {
      // Pull out of shelf
      tl.to(el, {
        y: -28,
        z: 60,
        rotateY: -18,
        rotateZ: -8,
        scale: 1.15,
        duration: (SHELF_ANIM.exitMs / 1000) * 0.38,
        ease: "power2.out",
      });
      // Fly to center + expand to cover
      tl.to(
        el,
        {
          left: targetX,
          top: targetY,
          width: coverW,
          height: coverH,
          y: 0,
          z: 120,
          rotateY: -6,
          rotateX: 2,
          rotateZ: 0,
          scale: 1,
          duration: (SHELF_ANIM.exitMs / 1000) * 0.62,
          ease: "power3.inOut",
          boxShadow: "0 40px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(178,34,52,0.25)",
        },
        "-=0.08",
      );
      // Cover flap open
      if (flap) {
        tl.to(
          flap,
          {
            rotateY: -28,
            duration: (SHELF_ANIM.openMs / 1000) * 0.55,
            ease: "power2.inOut",
          },
          "-=0.15",
        );
      }
      tl.to(
        el,
        {
          opacity: 0,
          scale: 1.06,
          duration: (SHELF_ANIM.openMs / 1000) * 0.35,
          ease: "power2.in",
        },
        "-=0.05",
      );
    }

    return () => {
      tl.kill();
    };
  }, [state.phase, fly]);

  // Return to shelf animation
  useEffect(() => {
    if (state.phase !== "closing" || !fly || !flyRef.current) return;

    animating.current = true;
    const el = flyRef.current;
    const reduced = prefersReducedMotion();
    const from = fly.from;
    const spineEl = spineRefs.current.get(fly.issue.id);
    const target = spineEl?.getBoundingClientRect() ?? from;

    gsap.set(el, {
      position: "fixed",
      left: window.innerWidth / 2 - 100,
      top: window.innerHeight / 2 - 140,
      width: 200,
      height: 280,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      rotateZ: 0,
      zIndex: 90,
      force3D: true,
    });

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        dispatch({ type: "CLOSE_DONE" });
        animating.current = false;
      },
    });

    if (reduced) {
      tl.to(el, {
        left: target.left,
        top: target.top,
        width: target.width,
        height: target.height,
        duration: 0.2,
        opacity: 0,
      });
    } else {
      tl.to(el, {
        left: target.left,
        top: target.top,
        width: Math.max(target.width, 18),
        height: target.height,
        rotateY: -12,
        rotateZ: -3,
        scale: 1,
        duration: SHELF_ANIM.closeMs / 1000,
        boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
      });
      tl.to(el, { opacity: 0, duration: 0.12, ease: "power1.in" }, "-=0.08");
    }

    return () => {
      tl.kill();
    };
  }, [state.phase, fly]);

  const selectIssue = useCallback(
    (issue: MagazineShelfIssue) => {
      if (state.phase !== "idle" || animating.current) return;
      const el = spineRefs.current.get(issue.id);
      const rect = el?.getBoundingClientRect();
      if (!rect) return;

      setFly({
        issue,
        from: rect,
        coverUrl: issue.cover_path ? publicUrl(issue.cover_path) : null,
      });
      dispatch({ type: "SELECT", id: issue.id, number: issue.number });
    },
    [state.phase],
  );

  const dismiss = useCallback(() => {
    if (state.phase !== "reading" && state.phase !== "opening") return;
    // Capture return target before close
    if (state.activeId) {
      const issue = issues.find((i) => i.id === state.activeId);
      const el = spineRefs.current.get(state.activeId);
      if (issue && el) {
        setFly({
          issue,
          from: el.getBoundingClientRect(),
          coverUrl: issue.cover_path ? publicUrl(issue.cover_path) : null,
        });
      }
    }
    dispatch({ type: "DISMISS" });
  }, [state.phase, state.activeId, issues]);

  // Escape immersive / dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (state.phase === "reading") {
        dismiss();
      } else if (immersive && state.phase === "idle") {
        setImmersive(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, immersive, dismiss]);

  // Lock scroll in immersive shelf mode (not while reading — FlipReader handles that)
  useEffect(() => {
    if (!immersive || state.phase === "reading") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [immersive, state.phase]);

  const onSpinePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
      if (state.phase !== "idle" || prefersReducedMotion()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, {
        z: immersive ? 48 : 28,
        rotateY: px * -16,
        rotateX: py * 8,
        y: immersive ? -18 : -12,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
      setHoveredId(id);
    },
    [state.phase, immersive],
  );

  const onSpinePointerLeave = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      z: 0,
      rotateY: 0,
      rotateX: 0,
      y: 0,
      duration: 0.45,
      ease: "power3.out",
      overwrite: "auto",
    });
    setHoveredId(null);
  }, []);

  const isBusy = state.phase !== "idle";

  /** Local mouse-wheel cascade while pointer is over the stage */
  const onStageWheel = useCallback(
    (e: React.WheelEvent) => {
      if (state.phase !== "idle" || prefersReducedMotion() || immersive) return;
      const spines = stageRef.current?.querySelectorAll<HTMLElement>("[data-spine]");
      if (!spines?.length) return;
      const delta = Math.max(-1, Math.min(1, e.deltaY / 80));
      spines.forEach((el, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.to(el, {
          rotateZ: dir * delta * 5,
          y: delta * 6,
          duration: 0.55,
          ease: "power2.out",
          overwrite: "auto",
          yoyo: true,
          repeat: 1,
          delay: i * 0.02,
        });
      });
    },
    [state.phase, immersive],
  );

  const pagesReady = loaded !== null && state.activeId !== null && loaded.id === state.activeId;
  const showReader = state.phase === "reading" && pagesReady;
  const showFlyLayer =
    fly && (state.phase === "exiting" || state.phase === "opening" || state.phase === "closing");

  const setSpineRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) spineRefs.current.set(id, node);
    else spineRefs.current.delete(id);
  }, []);

  return (
    <div
      ref={rootRef}
      className={[
        "relative w-full",
        immersive ? "fixed inset-0 z-[60] flex flex-col overflow-auto" : "",
      ].join(" ")}
      data-shelf-root
      data-shelf-phase={state.phase}
      data-shelf-active={state.activeId ?? ""}
      data-shelf-immersive={immersive ? "true" : "false"}
    >
      {/* Immersive backdrop */}
      {immersive && (
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          aria-hidden
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, #2a221c 0%, #0c0a09 70%)",
          }}
        />
      )}

      {/* Toolbar */}
      <div
        className={[
          "mb-6 flex flex-wrap items-center justify-between gap-3",
          immersive ? "sticky top-0 z-20 px-5 py-4 md:px-10" : "",
        ].join(" ")}
      >
        <p
          className={[
            "font-mono text-[10px] uppercase tracking-[0.28em]",
            immersive ? "text-white/50" : "text-muted-foreground",
          ].join(" ")}
          data-shelf-hint
        >
          {state.phase === "idle" &&
            (immersive
              ? "Pasa el ratón · clic para sacar del estante · Esc sale"
              : "Lomos finos · hover 3D · rueda / scroll · clic para abrir")}
          {state.phase === "exiting" && "Sacando del estante…"}
          {state.phase === "opening" && "Abriendo la tapa…"}
          {state.phase === "reading" &&
            (loadingPages || !pagesReady ? "Cargando páginas…" : "Leyendo · Esc cierra")}
          {state.phase === "closing" && "Devolviendo al estante…"}
        </p>
        <button
          type="button"
          onClick={() => setImmersive((v) => !v)}
          disabled={isBusy}
          className={[
            "border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] transition disabled:opacity-40",
            immersive
              ? "border-white/25 text-white hover:border-white hover:bg-white hover:text-black"
              : "border-foreground/20 hover:border-[#B22234] hover:bg-[#B22234] hover:text-white",
          ].join(" ")}
        >
          {immersive ? "Salir del Estante" : "Entrar al Estante"}
        </button>
      </div>

      {/* 3D Stage */}
      <div
        ref={stageRef}
        className={[
          "relative mx-auto w-full select-none",
          immersive ? "max-w-[1200px] flex-1 px-4 pb-16 md:px-8" : "max-w-[1100px]",
        ].join(" ")}
        style={{
          perspective: immersive ? "1600px" : "1200px",
          perspectiveOrigin: "50% 40%",
        }}
        onWheel={onStageWheel}
      >
        <div
          className={[
            "relative overflow-hidden rounded-sm border transition-[box-shadow,background] duration-500",
            immersive
              ? "border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
              : "border-foreground/10 shadow-[0_20px_50px_rgba(60,40,20,0.12)]",
          ].join(" ")}
          style={{
            background: immersive
              ? "linear-gradient(180deg, #1a1612 0%, #0f0d0b 100%)"
              : "linear-gradient(180deg, #f6f1e8 0%, #ebe4d6 48%, #e2d8c8 100%)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Subtle wood / paper grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
            aria-hidden
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent 0,
                  transparent 2px,
                  rgba(90,60,30,0.03) 2px,
                  rgba(90,60,30,0.03) 3px
                ),
                radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35), transparent 55%),
                radial-gradient(ellipse at 80% 80%, rgba(80,50,20,0.08), transparent 50%)
              `,
            }}
          />

          {/* Soft wall shadow */}
          <div
            className="pointer-events-none absolute inset-x-8 top-6 bottom-10 rounded-sm opacity-40"
            aria-hidden
            style={{
              background: immersive
                ? "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.5), transparent 70%)"
                : "radial-gradient(ellipse at 50% 20%, rgba(60,40,20,0.08), transparent 65%)",
            }}
          />

          <div
            className={[
              "relative z-10 flex flex-col justify-end gap-10 px-4 py-10 sm:px-8 sm:py-12 md:gap-12 md:px-12 md:py-14",
              // Mobile: horizontal carousel feel for first row emphasis
            ].join(" ")}
            style={{ transformStyle: "preserve-3d" }}
          >
            {issues.length === 0 ? (
              <p
                className={[
                  "py-16 text-center font-display text-2xl",
                  immersive ? "text-white/40" : "text-muted-foreground",
                ].join(" ")}
              >
                El estante está vacío
              </p>
            ) : (
              rows.map((rowSlots, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className="relative"
                  style={{ transformStyle: "preserve-3d" }}
                  data-shelf-row={rowIndex}
                >
                  {/* Magazines row — horizontal scroll on mobile */}
                  <div
                    className={[
                      "flex items-end justify-start gap-1.5 overflow-x-auto pb-1 pt-6 sm:justify-center sm:gap-2 sm:overflow-visible md:gap-2.5",
                      "snap-x snap-mandatory sm:snap-none",
                      "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    ].join(" ")}
                    style={{
                      transformStyle: "preserve-3d",
                      minHeight: immersive ? 240 : 200,
                    }}
                  >
                    {rowSlots.map((slot) => {
                      const issue = slot.issue;
                      const palette = spinePaletteForIssue(issue.number);
                      const isActive = state.activeId === issue.id;
                      const hidden =
                        isActive &&
                        (state.phase === "exiting" ||
                          state.phase === "opening" ||
                          state.phase === "reading" ||
                          state.phase === "closing");
                      const isHover = hoveredId === issue.id;
                      const dateLabel = formatSpineDate(issue.published_at);
                      const num = String(issue.number).padStart(2, "0");

                      return (
                        <button
                          key={issue.id}
                          type="button"
                          ref={(node) => setSpineRef(issue.id, node)}
                          data-spine
                          data-shelf-issue={issue.number}
                          disabled={isBusy}
                          aria-label={`Abrir N.º ${issue.number}: ${issue.title}`}
                          className={[
                            "group relative shrink-0 snap-center outline-none",
                            "focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2",
                            "disabled:cursor-default",
                            "transition-opacity duration-200",
                            hidden ? "opacity-0 pointer-events-none" : "opacity-100",
                          ].join(" ")}
                          style={{
                            width: immersive ? 26 : 22,
                            height: immersive ? 236 : 200,
                            transformStyle: "preserve-3d",
                            willChange: "transform",
                            filter: isHover
                              ? "drop-shadow(0 18px 22px rgba(0,0,0,0.35))"
                              : immersive
                                ? "drop-shadow(0 12px 16px rgba(0,0,0,0.45))"
                                : "drop-shadow(0 8px 12px rgba(40,25,10,0.22))",
                          }}
                          onPointerMove={(e) => onSpinePointerMove(e, issue.id)}
                          onPointerLeave={onSpinePointerLeave}
                          onClick={() => selectIssue(issue)}
                        >
                          {/* Spine body */}
                          <span
                            className="absolute inset-0 overflow-hidden"
                            style={{
                              background: `linear-gradient(90deg, ${palette.edge} 0%, ${palette.bg} 18%, ${palette.bg} 82%, ${palette.edge} 100%)`,
                              boxShadow: isHover
                                ? `inset 0 0 0 1px ${palette.accent}55, 0 0 24px ${palette.accent}33`
                                : `inset 0 0 0 1px rgba(255,255,255,0.06)`,
                            }}
                          >
                            {/* Edge highlight */}
                            <span
                              className="pointer-events-none absolute inset-y-0 left-0 w-[35%]"
                              style={{
                                background:
                                  "linear-gradient(90deg, rgba(255,255,255,0.14), transparent)",
                              }}
                            />
                            {/* Top band */}
                            <span
                              className="absolute inset-x-0 top-0 h-2"
                              style={{ background: palette.accent }}
                            />
                            {/* Vertical type stack */}
                            <span
                              className="absolute inset-0 flex flex-col items-center justify-between py-3"
                              style={{ color: palette.ink }}
                            >
                              <span
                                className="font-mono text-[7px] font-bold uppercase tracking-[0.18em]"
                                style={{
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                  letterSpacing: "0.22em",
                                  opacity: 0.85,
                                }}
                              >
                                RHECKYPOLITAN
                              </span>
                              <span
                                className="max-h-[42%] overflow-hidden font-display text-[10px] leading-none"
                                style={{
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                  opacity: 0.95,
                                }}
                                title={issue.title}
                              >
                                {issue.title}
                              </span>
                              <span className="flex flex-col items-center gap-1">
                                <span
                                  className="font-mono text-[9px] font-bold tabular-nums"
                                  style={{ color: palette.accent }}
                                >
                                  {num}
                                </span>
                                {dateLabel && (
                                  <span
                                    className="font-mono text-[6px] uppercase tracking-wider opacity-70"
                                    style={{
                                      writingMode: "vertical-rl",
                                      transform: "rotate(180deg)",
                                    }}
                                  >
                                    {dateLabel}
                                  </span>
                                )}
                              </span>
                            </span>
                            {/* Bottom ink band */}
                            <span
                              className="absolute inset-x-0 bottom-0 h-[18%]"
                              style={{
                                background: `linear-gradient(180deg, transparent, ${palette.accent}cc)`,
                              }}
                            />
                          </span>

                          {/* Thin page edge (depth cue) */}
                          <span
                            className="pointer-events-none absolute top-[6%] -right-[3px] bottom-[6%] w-[3px]"
                            aria-hidden
                            style={{
                              background: "linear-gradient(180deg, #f5efe4, #e8dfd0 40%, #d4c8b4)",
                              transform: "translateZ(-2px)",
                              boxShadow: "1px 0 2px rgba(0,0,0,0.15)",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Floating plank */}
                  <div
                    data-shelf-plank
                    className="relative mx-auto mt-0 h-3 w-full max-w-full sm:h-3.5"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: "rotateX(12deg)",
                      background: immersive
                        ? "linear-gradient(180deg, #6a5544 0%, #4a3a2e 45%, #2e241c 100%)"
                        : "linear-gradient(180deg, #d9cbb6 0%, #c4b49a 40%, #a89478 100%)",
                      boxShadow: immersive
                        ? "0 14px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)"
                        : "0 10px 24px rgba(60,40,20,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    {/* Metal / wood lip */}
                    <div
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        background: immersive ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.65)",
                      }}
                    />
                    <div
                      className="absolute -bottom-2 inset-x-[2%] h-2"
                      style={{
                        background: immersive
                          ? "linear-gradient(180deg, rgba(0,0,0,0.45), transparent)"
                          : "linear-gradient(180deg, rgba(60,40,20,0.2), transparent)",
                        filter: "blur(2px)",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {loadError && <p className="mt-3 text-center text-sm text-[#B22234]">{loadError}</p>}

      {/* Flying magazine layer (fixed 3D stage for extract / return) */}
      {showFlyLayer && fly && (
        <div
          className="pointer-events-none fixed inset-0 z-[90]"
          style={{ perspective: "1400px", perspectiveOrigin: "50% 45%" }}
          aria-hidden
        >
          <div
            ref={flyRef}
            data-fly-magazine
            data-fly-phase={state.phase}
            className="overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              background: "#111",
              boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            }}
          >
            <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
              {fly.coverUrl ? (
                <img
                  src={fly.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-[#1a1512] px-3 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#B22234]">
                    Rheckypolitan
                  </span>
                  <span className="mt-2 font-display text-xl text-[#f3e8d8]">
                    N.º {String(fly.issue.number).padStart(2, "0")}
                  </span>
                  <span className="mt-1 font-display text-sm italic text-[#f3e8d8]/80">
                    {fly.issue.title}
                  </span>
                </div>
              )}
              {/* Opening flap overlay */}
              <div
                ref={coverFlapRef}
                className="absolute inset-0 origin-left"
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  background: "linear-gradient(90deg, rgba(0,0,0,0.12), transparent 45%)",
                  boxShadow: "6px 0 20px rgba(0,0,0,0.28)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
                style={{
                  background: "linear-gradient(90deg, rgba(255,255,255,0.16), transparent)",
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* Loading veil */}
      {state.phase === "reading" && !pagesReady && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/88"
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
          closeLabel="Volver al Estante"
          showThumbnails
        />
      )}

      {(state.phase === "exiting" || state.phase === "opening" || state.phase === "closing") && (
        <div
          className="pointer-events-none fixed inset-0 z-[70] bg-black/55 backdrop-blur-[3px] transition-opacity duration-300"
          aria-hidden
          data-shelf-backdrop
        />
      )}
    </div>
  );
}
