/**
 * Pure fly-magazine poses for shelf pull-out / open / return animation.
 * Used by MagazineShelf FlyMagazine so CSS transitions have defined from→to states.
 */

export type FlyPose = "rest" | "lifted" | "open";

export type FlyPhase = "exiting" | "opening" | "closing" | "idle" | "reading";

/** CSS transform for each pose (relative to shelf slot). */
export function flyPoseTransform(pose: FlyPose): string {
  switch (pose) {
    case "rest":
      return "translateY(0) scale(1) rotate(0deg)";
    case "lifted":
      return "translateY(-130%) scale(1.45) rotate(-10deg)";
    case "open":
      return "translateY(-45vh) scale(3.2) rotate(0deg)";
    default:
      return "translateY(0) scale(1) rotate(0deg)";
  }
}

/**
 * Target pose for a shelf phase (after transition completes).
 * exiting → lifted (pull off shelf)
 * opening → open (grow / center)
 * closing → rest (return to shelf)
 */
export function targetPoseForPhase(phase: FlyPhase): FlyPose {
  if (phase === "exiting") return "lifted";
  if (phase === "opening") return "open";
  if (phase === "closing") return "rest";
  return "rest";
}

/**
 * Starting pose when entering a phase (before double-rAF applies the target).
 * exiting starts at rest so the pull animates.
 * closing starts at open so the return animates.
 * opening continues from lifted.
 */
export function entryPoseForPhase(phase: FlyPhase): FlyPose {
  if (phase === "exiting") return "rest";
  if (phase === "closing") return "open";
  if (phase === "opening") return "lifted";
  return "rest";
}

export function flyOpacity(pose: FlyPose, phase: FlyPhase): number {
  // Fade out as it "opens" into the full-screen reader
  if (phase === "opening" && pose === "open") return 0;
  return 1;
}
