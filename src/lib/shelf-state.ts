/**
 * Pure open/close state machine for the interactive magazine shelf.
 */

export type ShelfPhase =
  | "idle"
  | "exiting"
  | "opening"
  | "reading"
  | "closing";

export type ShelfMachineState = {
  phase: ShelfPhase;
  /** Issue number currently selected (null when idle). */
  activeNumber: number | null;
  /** Issue id for animation keying. */
  activeId: string | null;
};

export const initialShelfState: ShelfMachineState = {
  phase: "idle",
  activeNumber: null,
  activeId: null,
};

export type ShelfEvent =
  | { type: "SELECT"; id: string; number: number }
  | { type: "EXIT_DONE" }
  | { type: "OPEN_DONE" }
  | { type: "DISMISS" }
  | { type: "CLOSE_DONE" };

/**
 * Transition the shelf machine. Invalid events are no-ops (returns same state).
 */
export function reduceShelfState(
  state: ShelfMachineState,
  event: ShelfEvent,
): ShelfMachineState {
  switch (event.type) {
    case "SELECT": {
      if (state.phase !== "idle") return state;
      return {
        phase: "exiting",
        activeNumber: event.number,
        activeId: event.id,
      };
    }
    case "EXIT_DONE": {
      if (state.phase !== "exiting") return state;
      return { ...state, phase: "opening" };
    }
    case "OPEN_DONE": {
      if (state.phase !== "opening") return state;
      return { ...state, phase: "reading" };
    }
    case "DISMISS": {
      if (state.phase !== "reading" && state.phase !== "opening") return state;
      return { ...state, phase: "closing" };
    }
    case "CLOSE_DONE": {
      if (state.phase !== "closing") return state;
      return initialShelfState;
    }
    default:
      return state;
  }
}

/** Durations used by the UI (ms) — pure constants for tests/docs. */
export const SHELF_ANIM = {
  exitMs: 520,
  openMs: 480,
  closeMs: 420,
} as const;
