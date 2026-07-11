/**
 * Pure layout helpers for the SVG magazine bookshelf.
 * No DOM — unit-tested with real issue counts.
 */

export type ShelfIssueInput = {
  id: string;
  number: number;
  title: string;
  cover_path: string | null;
  /** ISO date string for spine label (optional). */
  published_at?: string | null;
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
    const x = countInRow === 1 ? 0.5 : pad + (usable * slot) / (countInRow - 1);
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

/** SVG/CSS pixel coords for a slot within the layout viewBox. */
export function slotPixelPosition(
  layout: ShelfLayout,
  slot: ShelfSlot,
): { x: number; y: number; spineW: number; spineH: number } {
  const { w, h } = layout.viewBox;
  // Thin editorial spines (lomos), not fat cover thumbnails
  const spineH = Math.min(168, h * 0.62);
  const spineW = 22;
  const x = slot.x * w;
  // Magazines sit on the board: bottom of spine near boardY * h
  const y = slot.boardY * h + 28;
  return { x, y, spineW, spineH };
}

/** Deterministic spine palette — wood / sepia / ink editorial tones. */
export const SPINE_PALETTES = [
  { bg: "#2c241c", ink: "#f3e8d8", accent: "#B22234", edge: "#1a1510" },
  { bg: "#5c4030", ink: "#f7efe3", accent: "#c9a66b", edge: "#3d2a1f" },
  { bg: "#1e2a32", ink: "#e8eef2", accent: "#8fa8b8", edge: "#121a20" },
  { bg: "#3d2c2e", ink: "#f5e6e4", accent: "#B22234", edge: "#26191a" },
  { bg: "#4a463c", ink: "#f0ebe0", accent: "#d4c4a0", edge: "#2e2b24" },
  { bg: "#243028", ink: "#e8f0ea", accent: "#7a9e88", edge: "#161e19" },
  { bg: "#4a3428", ink: "#f8ecd8", accent: "#e8c48a", edge: "#2f2118" },
  { bg: "#2a2228", ink: "#f2e8ee", accent: "#B22234", edge: "#181416" },
] as const;

export function spinePaletteForIssue(number: number) {
  const i = Math.abs(number) % SPINE_PALETTES.length;
  return SPINE_PALETTES[i]!;
}

/** Group layout slots into visual rows (for multi-board shelves). */
export function groupSlotsByRow(layout: ShelfLayout): ShelfSlot[][] {
  const rows: ShelfSlot[][] = Array.from({ length: layout.rows }, () => []);
  for (const slot of layout.slots) {
    rows[slot.row]?.push(slot);
  }
  return rows;
}
