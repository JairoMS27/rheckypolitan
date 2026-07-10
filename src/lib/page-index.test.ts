import { describe, expect, test } from "bun:test";
import {
  clampPageIndex,
  displayPageNumber,
  nextPageIndex,
  prevPageIndex,
} from "./page-index";

describe("page index helpers", () => {
  test("clampPageIndex bounds", () => {
    expect(clampPageIndex(-1, 5)).toBe(0);
    expect(clampPageIndex(0, 5)).toBe(0);
    expect(clampPageIndex(4, 5)).toBe(4);
    expect(clampPageIndex(99, 5)).toBe(4);
    expect(clampPageIndex(2, 0)).toBe(0);
  });

  test("next/prev page", () => {
    expect(nextPageIndex(0, 3)).toBe(1);
    expect(nextPageIndex(2, 3)).toBe(2);
    expect(prevPageIndex(2, 3)).toBe(1);
    expect(prevPageIndex(0, 3)).toBe(0);
  });

  test("displayPageNumber is 1-based", () => {
    expect(displayPageNumber(0, 10)).toBe(1);
    expect(displayPageNumber(9, 10)).toBe(10);
    expect(displayPageNumber(0, 0)).toBe(0);
  });
});
