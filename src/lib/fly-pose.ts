/**
 * Pure fly-magazine poses for shelf pull-out / open / return animation.
 */

export type FlyPose = "rest" | "lifted" | "open";

export type FlyPhase = "exiting" | "opening" | "closing" | "idle" | "reading";

/** CSS transform for each pose (relative to shelf slot). */
export function flyPoseTransform(pose: FlyPose): string {
  switch (pose) {
    case "rest":
      return "translate3d(0, 0, 0) scale(1) rotate(0deg)";
    case "lifted":
      return "translate3d(0, -40%, 40px) scale(1.55) rotate(-12deg)";
    case "open":
      return "translate3d(calc(50vw - 50%), calc(-42vh), 80px) scale(3.4) rotateY(-8deg)";
    default:
      return "translate3d(0, 0, 0) scale(1) rotate(0deg)";
  }
}

export function targetPoseForPhase(phase: FlyPhase): FlyPose {
  if (phase === "exiting") return "lifted";
  if (phase === "opening") return "open";
  if (phase === "closing") return "rest";
  return "rest";
}

export function entryPoseForPhase(phase: FlyPhase): FlyPose {
  if (phase === "exiting") return "rest";
  if (phase === "closing") return "open";
  if (phase === "opening") return "lifted";
  return "rest";
}

export function flyOpacity(pose: FlyPose, phase: FlyPhase): number {
  if (phase === "opening" && pose === "open") return 0;
  if (phase === "closing" && pose === "rest") return 1;
  return 1;
}
