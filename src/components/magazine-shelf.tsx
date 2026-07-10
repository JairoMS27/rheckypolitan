"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { publicUrl } from "@/lib/storage";
import {
  layoutShelfIssues,
  slotPixelPosition,
  type ShelfIssueInput,
} from "@/lib/shelf-layout";
import {
  initialShelfState,
  reduceShelfState,
  SHELF_ANIM,
  type ShelfMachineState,
} from "@/lib/shelf-state";
import {
  entryPoseForPhase,
  flyOpacity,
  flyPoseTransform,
  targetPoseForPhase,
  type FlyPose,
} from "@/lib/fly-pose";
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

/**
 * Interactive SVG bookshelf: click → pull out → open → flip pages.
 * No Three.js — SVG + CSS animation + shared FlipReader.
 */
export function MagazineShelf({ issues }: Props) {
  const [state, dispatch] = useReducer(
    (s: ShelfMachineState, e: Parameters<typeof reduceShelfState>[1]) =>
      reduceShelfState(s, e),
    initialShelfState,
  );
  const [loaded, setLoaded] = useState<LoadedPages | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const timers = useRef<number[]>([]);
  const loadGen = useRef(0);

  const layout = useMemo(() => layoutShelfIssues(issues, 6), [issues]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Timed phase transitions
  useEffect(() => {
    clearTimers();
    if (state.phase === "exiting") {
      timers.current.push(
        window.setTimeout(
          () => dispatch({ type: "EXIT_DONE" }),
          SHELF_ANIM.exitMs,
        ),
      );
    } else if (state.phase === "opening") {
      timers.current.push(
        window.setTimeout(
          () => dispatch({ type: "OPEN_DONE" }),
          SHELF_ANIM.openMs,
        ),
      );
    } else if (state.phase === "closing") {
      timers.current.push(
        window.setTimeout(
          () => dispatch({ type: "CLOSE_DONE" }),
          SHELF_ANIM.closeMs,
        ),
      );
    }
    return clearTimers;
  }, [state.phase, clearTimers]);

  /**
   * Load pages when an issue becomes active.
   * IMPORTANT: depends only on activeId — NOT on phase — so transitioning
   * exiting→opening→reading does NOT cancel the in-flight fetch (that was the reopen bug).
   */
  useEffect(() => {
    if (!state.activeId || !state.activeNumber) return;

    const gen = ++loadGen.current;
    let cancelled = false;
    setLoadingPages(true);
    setLoadError(null);
    // Drop stale pages immediately so we never show the previous issue's reader
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

  // Clear when fully closed
  useEffect(() => {
    if (state.phase === "idle") {
      setLoaded(null);
      setLoadError(null);
      setLoadingPages(false);
    }
  }, [state.phase]);

  const selectIssue = useCallback((issue: MagazineShelfIssue) => {
    dispatch({ type: "SELECT", id: issue.id, number: issue.number });
  }, []);

  const dismiss = useCallback(() => {
    dispatch({ type: "DISMISS" });
  }, []);

  const activeSlot = layout.slots.find((s) => s.issue.id === state.activeId);
  const flyFrom = activeSlot
    ? slotPixelPosition(layout, activeSlot)
    : { x: 500, y: 200, spineW: 52, spineH: 148 };

  const isBusy = state.phase !== "idle";
  const showFly =
    state.phase === "exiting" ||
    state.phase === "opening" ||
    state.phase === "closing";

  // Only show reader when phase is reading AND pages match the active issue
  const pagesReady =
    loaded !== null &&
    state.activeId !== null &&
    loaded.id === state.activeId;
  const showReader = state.phase === "reading" && pagesReady;

  const boardYs = useMemo(() => {
    const ys: number[] = [];
    for (let r = 0; r < layout.rows; r++) {
      const slot = layout.slots.find((s) => s.row === r);
      if (!slot) continue;
      const pos = slotPixelPosition(layout, slot);
      ys.push(pos.y + pos.spineH);
    }
    if (ys.length === 0) ys.push(layout.viewBox.h * 0.55);
    return ys;
  }, [layout]);

  return (
    <div
      className="relative w-full"
      data-shelf-root
      data-shelf-phase={state.phase}
      data-shelf-active={state.activeId ?? ""}
    >
      {/* Stage with perspective for fly layer */}
      <div
        className="relative mx-auto w-full max-w-[1100px] select-none"
        style={{
          aspectRatio: `${layout.viewBox.w} / ${layout.viewBox.h}`,
          perspective: "1200px",
        }}
      >
        <svg
          viewBox={`0 0 ${layout.viewBox.w} ${layout.viewBox.h}`}
          className="h-full w-full drop-shadow-xl"
          role="img"
          aria-label="Estante de revistas Rheckypolitan"
        >
          <defs>
            <linearGradient id="shelfWood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5a3c" />
              <stop offset="40%" stopColor="#a67048" />
              <stop offset="100%" stopColor="#5c3420" />
            </linearGradient>
            <linearGradient id="shelfPost" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3d2214" />
              <stop offset="50%" stopColor="#6b422c" />
              <stop offset="100%" stopColor="#3d2214" />
            </linearGradient>
            <linearGradient id="shelfBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#241810" />
              <stop offset="100%" stopColor="#0e0a08" />
            </linearGradient>
            <linearGradient id="shelfGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <filter id="shelfShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="4"
                floodColor="#000"
                floodOpacity="0.45"
              />
            </filter>
            <filter id="magShadow" x="-30%" y="-20%" width="160%" height="150%">
              <feDropShadow
                dx="2"
                dy="6"
                stdDeviation="5"
                floodColor="#000"
                floodOpacity="0.5"
              />
            </filter>
          </defs>

          {/* Cabinet body */}
          <rect
            x="14"
            y="6"
            width={layout.viewBox.w - 28}
            height={layout.viewBox.h - 12}
            fill="url(#shelfBack)"
            rx="4"
          />
          {/* Inner back panel highlight */}
          <rect
            x="42"
            y="28"
            width={layout.viewBox.w - 84}
            height={layout.viewBox.h - 50}
            fill="#1a120e"
            opacity="0.6"
            rx="2"
          />
          {/* Posts */}
          <rect
            x="14"
            y="6"
            width="24"
            height={layout.viewBox.h - 12}
            fill="url(#shelfPost)"
          />
          <rect
            x={layout.viewBox.w - 38}
            y="6"
            width="24"
            height={layout.viewBox.h - 12}
            fill="url(#shelfPost)"
          />
          {/* Cornice */}
          <rect
            x="8"
            y="2"
            width={layout.viewBox.w - 16}
            height="16"
            fill="url(#shelfWood)"
            filter="url(#shelfShadow)"
          />
          <rect
            x="8"
            y="2"
            width={layout.viewBox.w - 16}
            height="8"
            fill="url(#shelfGloss)"
          />

          {boardYs.map((y, row) => (
            <g key={`board-${row}`}>
              <rect
                x="42"
                y={y}
                width={layout.viewBox.w - 84}
                height="22"
                fill="url(#shelfWood)"
                filter="url(#shelfShadow)"
              />
              <rect
                x="42"
                y={y}
                width={layout.viewBox.w - 84}
                height="8"
                fill="url(#shelfGloss)"
              />
              <rect
                x="42"
                y={y + 18}
                width={layout.viewBox.w - 84}
                height="12"
                fill="#2a180f"
                opacity="0.95"
              />
              <line
                x1="52"
                y1={y + 6}
                x2={layout.viewBox.w - 52}
                y2={y + 6}
                stroke="#d4a574"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
            </g>
          ))}

          {layout.slots.map((slot) => {
            const pos = slotPixelPosition(layout, slot);
            const isActive = state.activeId === slot.issue.id;
            const hidden =
              isActive &&
              (state.phase === "exiting" ||
                state.phase === "opening" ||
                state.phase === "reading" ||
                state.phase === "closing");
            const cover = slot.issue.cover_path
              ? publicUrl(slot.issue.cover_path)
              : null;
            const spineX = pos.x - pos.spineW / 2;
            const spineY = pos.y;

            return (
              <g
                key={slot.issue.id}
                transform={`translate(${spineX}, ${spineY})`}
                opacity={hidden ? 0 : 1}
                data-shelf-issue={slot.issue.number}
                className="transition-opacity duration-150"
              >
                <title>
                  {`N.º ${String(slot.issue.number).padStart(2, "0")} · ${slot.issue.title}`}
                </title>
                <g
                  role="button"
                  tabIndex={isBusy ? -1 : 0}
                  aria-label={`Abrir N.º ${slot.issue.number}: ${slot.issue.title}`}
                  className="cursor-pointer outline-none"
                  style={{
                    transformOrigin: `${pos.spineW / 2}px ${pos.spineH}px`,
                    transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                  onMouseEnter={(e) => {
                    if (isBusy) return;
                    (e.currentTarget as SVGGElement).style.transform =
                      "translateY(-10px) scale(1.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as SVGGElement).style.transform = "";
                  }}
                  onClick={() => {
                    if (!isBusy) selectIssue(slot.issue);
                  }}
                  onKeyDown={(e) => {
                    if (isBusy) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectIssue(slot.issue);
                    }
                  }}
                >
                  {/* Shadow under magazine */}
                  <ellipse
                    cx={pos.spineW / 2}
                    cy={pos.spineH + 4}
                    rx={pos.spineW * 0.55}
                    ry="6"
                    fill="#000"
                    opacity="0.35"
                  />
                  <rect
                    width={pos.spineW}
                    height={pos.spineH}
                    fill="#121212"
                    stroke="#B22234"
                    strokeWidth="1.5"
                    filter="url(#magShadow)"
                  />
                  {cover ? (
                    <image
                      href={cover}
                      x="2.5"
                      y="2.5"
                      width={pos.spineW - 5}
                      height={pos.spineH - 5}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <rect
                      x="2.5"
                      y="2.5"
                      width={pos.spineW - 5}
                      height={pos.spineH - 5}
                      fill="#2a2a2a"
                    />
                  )}
                  {/* Gloss */}
                  <rect
                    x="2.5"
                    y="2.5"
                    width={pos.spineW * 0.35}
                    height={pos.spineH - 5}
                    fill="#fff"
                    opacity="0.08"
                  />
                  <rect
                    x="0"
                    y={pos.spineH - 28}
                    width={pos.spineW}
                    height="28"
                    fill="#B22234"
                  />
                  <text
                    x={pos.spineW / 2}
                    y={pos.spineH - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {String(slot.issue.number).padStart(2, "0")}
                  </text>
                </g>
              </g>
            );
          })}

          {issues.length === 0 && (
            <text
              x={layout.viewBox.w / 2}
              y={layout.viewBox.h / 2}
              textAnchor="middle"
              fill="#888888"
              fontFamily="Georgia, serif"
              fontSize="22"
            >
              El estante está vacío
            </text>
          )}
        </svg>

        {showFly && state.activeId && (
          <FlyMagazine
            key={`fly-${state.activeId}`}
            phase={state.phase}
            issue={issues.find((i) => i.id === state.activeId)!}
            from={flyFrom}
            viewBox={layout.viewBox}
          />
        )}
      </div>

      <p
        className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        data-shelf-hint
      >
        {state.phase === "idle" && "Clic en una revista · se sale del estante y se abre"}
        {state.phase === "exiting" && "Sacando del estante…"}
        {state.phase === "opening" && "Abriendo el número…"}
        {state.phase === "reading" &&
          (loadingPages || !pagesReady
            ? "Cargando páginas…"
            : "Leyendo · Esc cierra")}
        {state.phase === "closing" && "Devolviendo al estante…"}
      </p>
      {loadError && (
        <p className="mt-2 text-center text-sm text-[#B22234]">{loadError}</p>
      )}

      {/* Loading veil while in reading but pages not ready yet */}
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

      {(state.phase === "exiting" ||
        state.phase === "opening" ||
        state.phase === "closing") && (
        <div
          className="pointer-events-none fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
          aria-hidden
          data-shelf-backdrop
        />
      )}
    </div>
  );
}

function FlyMagazine({
  phase,
  issue,
  from,
  viewBox,
}: {
  phase: ShelfMachineState["phase"];
  issue: MagazineShelfIssue;
  from: { x: number; y: number; spineW: number; spineH: number };
  viewBox: { w: number; h: number };
}) {
  const cover = issue.cover_path ? publicUrl(issue.cover_path) : null;
  const leftPct = (from.x / viewBox.w) * 100;
  const topPct = (from.y / viewBox.h) * 100;

  const [pose, setPose] = useState<FlyPose>(() => entryPoseForPhase(phase));
  const [transitionsOn, setTransitionsOn] = useState(false);

  useLayoutEffect(() => {
    const entry = entryPoseForPhase(phase);
    const target = targetPoseForPhase(phase);

    setTransitionsOn(false);
    setPose(entry);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setTransitionsOn(true);
        setPose(target);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase]);

  const duration =
    phase === "closing"
      ? SHELF_ANIM.closeMs
      : phase === "opening"
        ? SHELF_ANIM.openMs
        : SHELF_ANIM.exitMs;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: from.spineW,
    height: from.spineH,
    marginLeft: -from.spineW / 2,
    zIndex: 75,
    transformOrigin: "center bottom",
    willChange: "transform, opacity",
    transition: transitionsOn
      ? `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${Math.round(duration * 0.85)}ms ease`
      : "none",
    transform: flyPoseTransform(pose),
    opacity: flyOpacity(pose, phase),
    pointerEvents: "none",
  };

  return (
    <div
      style={style}
      data-fly-magazine
      data-fly-phase={phase}
      data-fly-pose={pose}
      data-fly-transitions={transitionsOn ? "on" : "off"}
    >
      <div
        className="relative h-full w-full overflow-hidden border-2 border-[#B22234] bg-foreground"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(178,34,52,0.3)",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-background">
            {String(issue.number).padStart(2, "0")}
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.18), transparent)",
          }}
        />
      </div>
    </div>
  );
}
