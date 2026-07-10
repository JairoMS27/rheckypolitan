import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SHELF_PER_ROW,
  layoutShelfIssues,
  slotPixelPosition,
  type ShelfIssueInput,
} from "./shelf-layout";

function fakeIssues(n: number): ShelfIssueInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    number: n - i,
    title: `Issue ${n - i}`,
    cover_path: i % 2 === 0 ? `covers/${i}.jpg` : null,
  }));
}

describe("layoutShelfIssues", () => {
  test("empty list yields zero rows and slots", () => {
    const layout = layoutShelfIssues([]);
    expect(layout.slots).toEqual([]);
    expect(layout.rows).toBe(0);
  });

  test("places all issues and uses DEFAULT_SHELF_PER_ROW", () => {
    const issues = fakeIssues(8);
    const layout = layoutShelfIssues(issues);
    expect(layout.slots).toHaveLength(8);
    expect(layout.perRow).toBe(DEFAULT_SHELF_PER_ROW);
    expect(layout.rows).toBe(2);
    expect(layout.slots[0]!.issue.number).toBe(8);
    expect(layout.slots[0]!.row).toBe(0);
    expect(layout.slots[6]!.row).toBe(1);
  });

  test("custom perRow changes row count", () => {
    const layout = layoutShelfIssues(fakeIssues(10), 4);
    expect(layout.rows).toBe(3);
    expect(layout.perRow).toBe(4);
    expect(layout.slots.every((s) => s.slot < 4)).toBe(true);
  });

  test("x positions stay within padded bounds", () => {
    const layout = layoutShelfIssues(fakeIssues(6), 6);
    for (const s of layout.slots) {
      expect(s.x).toBeGreaterThanOrEqual(0.08);
      expect(s.x).toBeLessThanOrEqual(0.92);
    }
  });

  test("slotPixelPosition returns finite coords inside viewBox", () => {
    const layout = layoutShelfIssues(fakeIssues(3), 6);
    const slot = layout.slots[1]!;
    const pos = slotPixelPosition(layout, slot);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(layout.viewBox.w);
    expect(pos.spineW).toBeGreaterThan(0);
    expect(pos.spineH).toBeGreaterThan(0);
  });
});
