/**
 * Pure layout helpers for the SVG magazine bookshelf.
 * No DOM — unit-tested with real issue counts.
 */

export type ShelfIssueInput = {
  id: string;
  number: number;
  title: string;
  cover_path: string | null;
};

export type ShelfSlot = {
  issueIndex: number;
  issue: ShelfIssueInput;
  /** Slot index within the shelf row (0-based). */
  slot: number;
  /** Row index (0 = top shelf). */
  row: number;
  /** Normalized x center of the spine on the shelf board (0–1). */
  x: number;
  /** Normalized y of the board top surface for this row (0–1, SVG viewBox relative). */
  boardY: number;
};

export type ShelfLayout = {
  slots: ShelfSlot[];
  rows: number;
  perRow: number;
  viewBox: { w: number; h: number };
};

/** Default capacity per physical shelf board. */
export const DEFAULT_SHELF_PER_ROW = 6;

/**
 * Place N issues onto shelf boards (row-major, newest first already ordered by caller).
 * Spines are evenly spaced with side padding so click targets don't hug the edges.
 */
export function layoutShelfIssues(
  issues: ShelfIssueInput[],
  perRow: number = DEFAULT_SHELF_PER_ROW,
): ShelfLayout {
  const safePerRow = Math.max(1, Math.floor(perRow));
  const rows = issues.length === 0 ? 0 : Math.ceil(issues.length / safePerRow);
  const viewW = 1000;
  const boardHeight = 180;
  const topPad = 40;
  const viewH = Math.max(topPad + rows * boardHeight + 40, 220);

  const slots: ShelfSlot[] = issues.map((issue, issueIndex) => {
    const row = Math.floor(issueIndex / safePerRow);
    const slot = issueIndex % safePerRow;
    const countInRow = Math.min(safePerRow, issues.length - row * safePerRow);
    // Side padding 8% each side; distribute spines evenly
    const pad = 0.08;
    const usable = 1 - pad * 2;
    const x =
      countInRow === 1
        ? 0.5
        : pad + (usable * slot) / (countInRow - 1);
    const boardY = (topPad + row * boardHeight + 20) / viewH;
    return {
      issueIndex,
      issue,
      slot,
      row,
      x,
      boardY,
    };
  });

  return {
    slots,
    rows,
    perRow: safePerRow,
    viewBox: { w: viewW, h: viewH },
  };
}

/** SVG pixel coords for a slot within the layout viewBox. */
export function slotPixelPosition(
  layout: ShelfLayout,
  slot: ShelfSlot,
): { x: number; y: number; spineW: number; spineH: number } {
  const { w, h } = layout.viewBox;
  const spineH = Math.min(140, h * 0.55);
  const spineW = 48;
  const x = slot.x * w;
  // Magazines sit on the board: bottom of spine near boardY * h
  const y = slot.boardY * h + 28;
  return { x, y, spineW, spineH };
}
