/**
 * Pure page index helpers for the flip reader.
 */

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
