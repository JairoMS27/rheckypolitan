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
  const timers = useRef<number[]>([]);

  const layout = useMemo(() => layoutShelfIssues(issues, 6), [issues]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

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
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "exiting" && state.phase !== "opening") return;
    if (!state.activeNumber || !state.activeId) return;
    let cancelled = false;
    setLoadError(null);

    (async () => {
      const issueMeta = issues.find((i) => i.id === state.activeId);
      const { data: iss } = await supabase
        .from("issues")
        .select("id,number,title")
        .eq("number", state.activeNumber!)
        .maybeSingle();
      if (cancelled) return;
      if (!iss) {
        setLoaded({
          number: state.activeNumber!,
          title: issueMeta?.title ?? `N.º ${state.activeNumber}`,
          pages: [],
        });
        return;
      }
      const { data: pg } = await supabase
        .from("pages")
        .select("index,image_path")
        .eq("issue_id", iss.id)
        .order("index");
      if (cancelled) return;
      setLoaded({
        number: iss.number,
        title: iss.title,
        pages: (pg as FlipPage[] | null) ?? [],
      });
    })().catch((err) => {
      if (!cancelled) {
        setLoadError(err instanceof Error ? err.message : "Error al cargar");
        setLoaded({
          number: state.activeNumber!,
          title: issues.find((i) => i.id === state.activeId)?.title ?? "",
          pages: [],
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.activeNumber, state.activeId, issues]);

  useEffect(() => {
    if (state.phase === "idle") {
      setLoaded(null);
      setLoadError(null);
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
    : { x: 500, y: 200, spineW: 48, spineH: 140 };

  const isBusy = state.phase !== "idle";
  const showFly =
    state.phase === "exiting" ||
    state.phase === "opening" ||
    state.phase === "closing";
  const showReader = state.phase === "reading" && loaded !== null;

  // Board Y positions derived from first slot of each row
  const boardYs = useMemo(() => {
    const ys: number[] = [];
    for (let r = 0; r < layout.rows; r++) {
      const slot = layout.slots.find((s) => s.row === r);
      if (!slot) continue;
      const pos = slotPixelPosition(layout, slot);
      // Board sits just under the magazine bottom
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
    >
      <div
        className="relative mx-auto w-full max-w-[1100px] select-none"
        style={{ aspectRatio: `${layout.viewBox.w} / ${layout.viewBox.h}` }}
      >
        <svg
          viewBox={`0 0 ${layout.viewBox.w} ${layout.viewBox.h}`}
          className="h-full w-full"
          role="img"
          aria-label="Estante de revistas Rheckypolitan"
        >
          <defs>
            <linearGradient id="shelfWood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7a4a30" />
              <stop offset="50%" stopColor="#9a6342" />
              <stop offset="100%" stopColor="#5c3420" />
            </linearGradient>
            <linearGradient id="shelfPost" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3d2214" />
              <stop offset="50%" stopColor="#5a3220" />
              <stop offset="100%" stopColor="#3d2214" />
            </linearGradient>
            <linearGradient id="shelfBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1410" />
              <stop offset="100%" stopColor="#0c0907" />
            </linearGradient>
            <filter id="shelfShadow" x="-15%" y="-15%" width="130%" height="140%">
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="3"
                floodColor="#000"
                floodOpacity="0.4"
              />
            </filter>
          </defs>

          {/* Cabinet */}
          <rect
            x="16"
            y="8"
            width={layout.viewBox.w - 32}
            height={layout.viewBox.h - 16}
            fill="url(#shelfBack)"
            rx="3"
          />
          <rect
            x="16"
            y="8"
            width="20"
            height={layout.viewBox.h - 16}
            fill="url(#shelfPost)"
          />
          <rect
            x={layout.viewBox.w - 36}
            y="8"
            width="20"
            height={layout.viewBox.h - 16}
            fill="url(#shelfPost)"
          />
          {/* Top cornice */}
          <rect
            x="12"
            y="4"
            width={layout.viewBox.w - 24}
            height="14"
            fill="url(#shelfWood)"
          />

          {boardYs.map((y, row) => (
            <g key={`board-${row}`}>
              <rect
                x="40"
                y={y}
                width={layout.viewBox.w - 80}
                height="20"
                fill="url(#shelfWood)"
                filter="url(#shelfShadow)"
              />
              <rect
                x="40"
                y={y + 16}
                width={layout.viewBox.w - 80}
                height="10"
                fill="#2e1a10"
                opacity="0.9"
              />
              <line
                x1="48"
                y1={y + 5}
                x2={layout.viewBox.w - 48}
                y2={y + 5}
                stroke="#c49a78"
                strokeOpacity="0.25"
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
              >
                <title>
                  {`N.º ${String(slot.issue.number).padStart(2, "0")} · ${slot.issue.title}`}
                </title>
                <g
                  role="button"
                  tabIndex={isBusy ? -1 : 0}
                  aria-label={`Abrir N.º ${slot.issue.number}: ${slot.issue.title}`}
                  className="cursor-pointer outline-none focus:outline-none"
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
                  <rect
                    width={pos.spineW}
                    height={pos.spineH}
                    fill="#141414"
                    stroke="#B22234"
                    strokeWidth="1.5"
                    filter="url(#shelfShadow)"
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
                  <rect
                    x="0"
                    y={pos.spineH - 26}
                    width={pos.spineW}
                    height="26"
                    fill="#B22234"
                    opacity="0.95"
                  />
                  <text
                    x={pos.spineW / 2}
                    y={pos.spineH - 9}
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

        {/* Keep mounted across exiting→opening→closing so CSS transitions can run */}
        {showFly && state.activeId && (
          <FlyMagazine
            key={state.activeId}
            phase={state.phase}
            issue={issues.find((i) => i.id === state.activeId)!}
            from={flyFrom}
            viewBox={layout.viewBox}
          />
        )}
      </div>

      <p
        className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        data-shelf-hint
      >
        {isBusy
          ? state.phase === "closing"
            ? "Volviendo al estante…"
            : state.phase === "reading"
              ? "Leyendo"
              : "Sacando el número del estante…"
          : "Clic en una revista para sacarla y leerla"}
      </p>
      {loadError && (
        <p className="mt-2 text-center text-sm text-[#B22234]">{loadError}</p>
      )}

      {showReader && loaded && (
        <FlipReader
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
          className="pointer-events-none fixed inset-0 z-[70] bg-black/45"
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

  // Pose state: always paint entry pose first, then double-rAF to target so CSS transitions run
  const [pose, setPose] = useState<FlyPose>(() => entryPoseForPhase(phase));
  const [transitionsOn, setTransitionsOn] = useState(false);

  useLayoutEffect(() => {
    const entry = entryPoseForPhase(phase);
    const target = targetPoseForPhase(phase);

    // First paint: entry pose, no transition (avoids jump-to-end on mount)
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
    transition: transitionsOn
      ? `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${duration}ms ease`
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
      <div className="relative h-full w-full overflow-hidden border-2 border-[#B22234] bg-foreground shadow-2xl">
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
      </div>
    </div>
  );
}
