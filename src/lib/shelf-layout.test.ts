import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SHELF_PER_ROW,
  groupSlotsByRow,
  layoutShelfIssues,
  slotPixelPosition,
  spinePaletteForIssue,
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

  test("spines are thin editorial lomos (not fat covers)", () => {
    const layout = layoutShelfIssues(fakeIssues(2), 6);
    const pos = slotPixelPosition(layout, layout.slots[0]!);
    expect(pos.spineW).toBeLessThanOrEqual(28);
    expect(pos.spineH).toBeGreaterThan(pos.spineW * 4);
  });

  test("groupSlotsByRow buckets by row index", () => {
    const layout = layoutShelfIssues(fakeIssues(10), 4);
    const groups = groupSlotsByRow(layout);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(4);
    expect(groups[1]).toHaveLength(4);
    expect(groups[2]).toHaveLength(2);
  });

  test("spinePaletteForIssue is deterministic", () => {
    expect(spinePaletteForIssue(1)).toEqual(spinePaletteForIssue(1));
    expect(spinePaletteForIssue(1).bg).not.toBe(spinePaletteForIssue(2).bg);
  });
});
