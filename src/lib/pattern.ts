// Pattern model, serpentine stitch order and the .knitpx file format.

export type Pattern = {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Row-major, top row first. 1 = fill (full square), 0 = chain (open square). */
  cells: number[];
  /** Number of finished stitches, counted in working order. */
  progress: number;
  createdAt: number;
  updatedAt: number;
};

export const MIN_SIZE = 1;
export const MAX_SIZE = 200;
export const FILE_EXTENSION = ".knitpx";

const FILL_CHAR = "#";
const CHAIN_CHAR = ".";

export const clampSize = (n: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n)));

export function newId() {
  return crypto.randomUUID();
}

export function createPattern(name: string, width: number, height: number, cells?: number[]): Pattern {
  const now = Date.now();
  return {
    id: newId(),
    name,
    width,
    height,
    cells: cells ?? new Array(width * height).fill(0),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const totalStitches = (p: Pick<Pattern, "width" | "height">) => p.width * p.height;

/**
 * Work order: start bottom-left, row 1 runs left → right, row 2 right → left, and so on.
 * Returns the cell (x, y with y = 0 at the top) worked as stitch number `i`.
 */
export function stitchToCell(width: number, height: number, i: number) {
  const row = Math.floor(i / width); // 0-based, counted from the bottom
  const pos = i % width;
  const x = row % 2 === 0 ? pos : width - 1 - pos;
  return { x, y: height - 1 - row };
}

export function cellToStitch(width: number, height: number, x: number, y: number) {
  const row = height - 1 - y;
  const pos = row % 2 === 0 ? x : width - 1 - x;
  return row * width + pos;
}

export type Run = { fill: boolean; count: number; start: number };

/** Runs of identical stitches in row `row` (0-based from the bottom), in working order. */
export function rowRuns(p: Pattern, row: number): Run[] {
  const runs: Run[] = [];
  for (let pos = 0; pos < p.width; pos++) {
    const { x, y } = stitchToCell(p.width, p.height, row * p.width + pos);
    const fill = p.cells[y * p.width + x] === 1;
    const last = runs[runs.length - 1];
    if (last && last.fill === fill) last.count++;
    else runs.push({ fill, count: 1, start: pos });
  }
  return runs;
}

/**
 * Resize, keeping the bottom-left corner fixed: the chart is worked from there,
 * so growing adds rows on top and stitches on the right.
 */
export function resize(p: Pattern, width: number, height: number): Pattern {
  const cells = new Array(width * height).fill(0);
  for (let y = 0; y < height; y++) {
    const srcY = y - (height - p.height);
    if (srcY < 0 || srcY >= p.height) continue;
    for (let x = 0; x < Math.min(width, p.width); x++) {
      cells[y * width + x] = p.cells[srcY * p.width + x];
    }
  }
  // Rows are counted from the bottom, which stays put, so finished rows stay finished.
  const rowsDone = Math.floor(p.progress / p.width);
  const inRow = Math.min(p.progress % p.width, width);
  const progress = Math.min(rowsDone * width + inRow, width * height);
  return { ...p, width, height, cells, progress };
}

/** 4-way flood fill from (x, y), setting the connected region to `value`. */
export function floodFill(cells: number[], width: number, height: number, x: number, y: number, value: number) {
  const target = cells[y * width + x];
  if (target === value) return cells;
  const out = cells.slice();
  const stack = [y * width + x];
  while (stack.length) {
    const i = stack.pop()!;
    if (out[i] !== target) continue;
    out[i] = value;
    const cx = i % width;
    const cy = (i - cx) / width;
    if (cx > 0) stack.push(i - 1);
    if (cx < width - 1) stack.push(i + 1);
    if (cy > 0) stack.push(i - width);
    if (cy < height - 1) stack.push(i + width);
  }
  return out;
}

// ---------- .knitpx ----------

export type KnitpxFile = {
  format: "knitpx";
  version: 1;
  /** Lets a re-import recognise a pattern it already has. */
  id?: string;
  name: string;
  width: number;
  height: number;
  /** Top row first. "#" = fill, "." = chain. */
  rows: string[];
  /** Finished stitches, in working order. Only in progress saves. */
  progress?: number;
};

export function toKnitpx(p: Pattern, { withProgress = false } = {}): string {
  const rows: string[] = [];
  for (let y = 0; y < p.height; y++) {
    let line = "";
    for (let x = 0; x < p.width; x++) line += p.cells[y * p.width + x] ? FILL_CHAR : CHAIN_CHAR;
    rows.push(line);
  }
  const file: KnitpxFile = { format: "knitpx", version: 1, id: p.id, name: p.name, width: p.width, height: p.height, rows };
  if (withProgress) file.progress = p.progress;
  return JSON.stringify(file, null, 2) + "\n";
}

export class KnitpxError extends Error {}

export function fromKnitpx(text: string): Pattern {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new KnitpxError("This file isn't valid JSON.");
  }
  if (typeof data !== "object" || data === null) throw new KnitpxError("This file isn't a .knitpx pattern.");
  const f = data as Partial<KnitpxFile>;
  if (f.format !== "knitpx") throw new KnitpxError("This file isn't a .knitpx pattern.");
  if (f.version !== 1) throw new KnitpxError(`Unsupported .knitpx version: ${String(f.version)}.`);
  if (!Array.isArray(f.rows) || f.rows.length === 0) throw new KnitpxError("The pattern has no rows.");

  const height = f.rows.length;
  const width = typeof f.rows[0] === "string" ? f.rows[0].length : 0;
  if (width < MIN_SIZE || width > MAX_SIZE || height > MAX_SIZE) {
    throw new KnitpxError(`Patterns must be between ${MIN_SIZE} and ${MAX_SIZE} stitches each way.`);
  }
  if ((f.width !== undefined && f.width !== width) || (f.height !== undefined && f.height !== height)) {
    throw new KnitpxError("The pattern's size doesn't match its rows.");
  }

  const cells: number[] = [];
  f.rows.forEach((row, y) => {
    if (typeof row !== "string" || row.length !== width) {
      throw new KnitpxError(`Row ${height - y} has the wrong length.`);
    }
    for (const ch of row) {
      if (ch === FILL_CHAR) cells.push(1);
      else if (ch === CHAIN_CHAR) cells.push(0);
      else throw new KnitpxError(`Unexpected character "${ch}" in row ${height - y}.`);
    }
  });

  const name = typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Imported pattern";
  const pattern = createPattern(name, width, height, cells);
  if (typeof f.id === "string" && f.id) pattern.id = f.id;
  if (f.progress !== undefined) {
    if (!Number.isInteger(f.progress) || f.progress < 0 || f.progress > width * height) {
      throw new KnitpxError("The saved progress doesn't fit this pattern.");
    }
    pattern.progress = f.progress;
  }
  return pattern;
}

/** Whether two patterns are the same chart, stitch for stitch. */
export function sameChart(a: Pattern, b: Pattern) {
  return a.width === b.width && a.height === b.height && a.cells.every((c, i) => c === b.cells[i]);
}

/** Parse a picture-style bitmap (top row first, X/# = fill). Used for the starter patterns. */
export function fromBitmap(name: string, lines: string[]): Pattern {
  const width = Math.max(...lines.map((l) => l.length));
  const cells = lines.flatMap((l) => [...l.padEnd(width, ".")].map((c) => (c === "X" || c === "#" ? 1 : 0)));
  return createPattern(name, width, lines.length, cells);
}

export function fileName(p: Pattern, suffix = "") {
  const slug = p.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (slug || "pattern") + suffix + FILE_EXTENSION;
}
