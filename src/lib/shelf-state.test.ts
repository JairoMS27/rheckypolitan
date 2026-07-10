import { describe, expect, test } from "bun:test";
import {
  initialShelfState,
  reduceShelfState,
  type ShelfMachineState,
} from "./shelf-state";

describe("reduceShelfState", () => {
  test("SELECT from idle enters exiting with active issue", () => {
    const next = reduceShelfState(initialShelfState, {
      type: "SELECT",
      id: "abc",
      number: 3,
    });
    expect(next).toEqual({
      phase: "exiting",
      activeNumber: 3,
      activeId: "abc",
    });
  });

  test("full open then dismiss path", () => {
    let s: ShelfMachineState = initialShelfState;
    s = reduceShelfState(s, { type: "SELECT", id: "x", number: 1 });
    expect(s.phase).toBe("exiting");
    s = reduceShelfState(s, { type: "EXIT_DONE" });
    expect(s.phase).toBe("opening");
    s = reduceShelfState(s, { type: "OPEN_DONE" });
    expect(s.phase).toBe("reading");
    s = reduceShelfState(s, { type: "DISMISS" });
    expect(s.phase).toBe("closing");
    s = reduceShelfState(s, { type: "CLOSE_DONE" });
    expect(s).toEqual(initialShelfState);
  });

  test("ignores SELECT while reading", () => {
    const reading: ShelfMachineState = {
      phase: "reading",
      activeNumber: 2,
      activeId: "a",
    };
    const next = reduceShelfState(reading, {
      type: "SELECT",
      id: "b",
      number: 9,
    });
    expect(next).toEqual(reading);
  });

  test("ignores EXIT_DONE when idle", () => {
    expect(reduceShelfState(initialShelfState, { type: "EXIT_DONE" })).toEqual(
      initialShelfState,
    );
  });

  test("second SELECT works after full close cycle (reopen bug regression)", () => {
    let s = initialShelfState;
    s = reduceShelfState(s, { type: "SELECT", id: "a", number: 1 });
    s = reduceShelfState(s, { type: "EXIT_DONE" });
    s = reduceShelfState(s, { type: "OPEN_DONE" });
    s = reduceShelfState(s, { type: "DISMISS" });
    s = reduceShelfState(s, { type: "CLOSE_DONE" });
    expect(s.phase).toBe("idle");
    s = reduceShelfState(s, { type: "SELECT", id: "b", number: 7 });
    expect(s.phase).toBe("exiting");
    expect(s.activeId).toBe("b");
    expect(s.activeNumber).toBe(7);
    s = reduceShelfState(s, { type: "EXIT_DONE" });
    s = reduceShelfState(s, { type: "OPEN_DONE" });
    expect(s.phase).toBe("reading");
    expect(s.activeNumber).toBe(7);
  });
});
