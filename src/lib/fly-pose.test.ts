import { describe, expect, test } from "bun:test";
import {
  entryPoseForPhase,
  flyOpacity,
  flyPoseTransform,
  targetPoseForPhase,
} from "./fly-pose";

describe("fly-pose animation helpers", () => {
  test("exiting pulls from rest to lifted (enables CSS transition path)", () => {
    expect(entryPoseForPhase("exiting")).toBe("rest");
    expect(targetPoseForPhase("exiting")).toBe("lifted");
    expect(flyPoseTransform("rest")).not.toBe(flyPoseTransform("lifted"));
  });

  test("closing returns from open to rest", () => {
    expect(entryPoseForPhase("closing")).toBe("open");
    expect(targetPoseForPhase("closing")).toBe("rest");
  });

  test("opening continues from lifted to open and fades", () => {
    expect(entryPoseForPhase("opening")).toBe("lifted");
    expect(targetPoseForPhase("opening")).toBe("open");
    expect(flyOpacity("open", "opening")).toBe(0);
    expect(flyOpacity("lifted", "exiting")).toBe(1);
  });

  test("transforms are distinct CSS strings", () => {
    const set = new Set([
      flyPoseTransform("rest"),
      flyPoseTransform("lifted"),
      flyPoseTransform("open"),
    ]);
    expect(set.size).toBe(3);
  });
});
