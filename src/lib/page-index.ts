/**
 * Pure page index helpers for the flip reader.
 * FlipReader imports these for onFlip / bounds — tests drive the same functions.
 */

export type PageRef = {
  index: number;
  image_path: string;
};

export function clampPageIndex(index: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(totalPages - 1, Math.floor(index)));
}

export function nextPageIndex(index: number, totalPages: number): number {
  return clampPageIndex(index + 1, totalPages);
}

export function prevPageIndex(index: number, totalPages: number): number {
  return clampPageIndex(index - 1, totalPages);
}

/** 1-based display page (for UI labels). */
export function displayPageNumber(index: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return clampPageIndex(index, totalPages) + 1;
}

/**
 * What FlipReader does when HTMLFlipBook reports a flip (onFlip → clamp → display).
 * Driven against a real pages[] list (same shape as Supabase `pages` rows).
 */
export function applyFlipReport(
  reportedIndex: number,
  pages: readonly PageRef[],
): { index: number; image_path: string | null; display: number } {
  const total = pages.length;
  const index = clampPageIndex(reportedIndex, total);
  const page = pages[index];
  return {
    index,
    image_path: page?.image_path ?? null,
    display: displayPageNumber(index, total),
  };
}

/** Next/prev as if the reader buttons flipped one page over a real pages list. */
export function applyPageStep(
  currentIndex: number,
  pages: readonly PageRef[],
  step: 1 | -1,
): { index: number; image_path: string | null; display: number } {
  const total = pages.length;
  const index =
    step === 1
      ? nextPageIndex(currentIndex, total)
      : prevPageIndex(currentIndex, total);
  const page = pages[index];
  return {
    index,
    image_path: page?.image_path ?? null,
    display: displayPageNumber(index, total),
  };
}
