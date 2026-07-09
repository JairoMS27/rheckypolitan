import { describe, expect, test } from "bun:test";

describe("scheduleEmailQueueProcessing", () => {
  test("exports a scheduling helper", async () => {
    const mod = await import("./schedule-queue");
    expect(typeof mod.scheduleEmailQueueProcessing).toBe("function");
  });
});