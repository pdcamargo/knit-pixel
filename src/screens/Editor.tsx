import { useCallback, useEffect, useRef, useState } from "react";
import { Contrast, Download, Eraser, Hand, Move, PaintBucket, Pencil, Play, Redo2, SlidersHorizontal, SquareDashed, Trash2, TrianglesCenterlineDashedHorizontal, TrianglesCenterlineDashedVertical, Undo2, X } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { ChartCanvas } from "../components/ChartCanvas";
import { Thumbnail } from "../components/Thumbnail";
import { Button, IconButton, NumberStepper, Panel, TextField } from "../components/ui";
import { downloadPattern } from "../lib/files";
import { clipRect, floodFill, MAX_SIZE, MIN_SIZE, moveCells, resize, type Pattern, type Rect } from "../lib/pattern";
import { navigate } from "../lib/router";
import { savePattern } from "../lib/store";

type Tool = "fill" | "chain" | "bucket" | "select" | "move" | "pan";
type Cell = { x: number; y: number };
/** Which side of the chart stays put on resize: 0 = left / top, 0.5 = middle, 1 = right / bottom. */
type Anchor = { ax: number; ay: number };
type Snapshot = Pick<Pattern, "width" | "height" | "cells" | "progress">;

const TOOLS = [
  { id: "fill", icon: Pencil, label: "Fill — full square (P)", key: "p" },
  { id: "chain", icon: Eraser, label: "Chain — open square (E)", key: "e" },
  { id: "bucket", icon: PaintBucket, label: "Bucket — swap a connected area (B)", key: "b" },
  { id: "select", icon: SquareDashed, label: "Select — drag a box, drag inside it to move (S)", key: "s" },
  { id: "move", icon: Move, label: "Move — drag the selection, or the whole chart (V)", key: "v" },
  { id: "pan", icon: Hand, label: "Hand — drag to move around (H, or hold Space)", key: "h" },
] as const;

const snap = (p: Pattern): Snapshot => ({ width: p.width, height: p.height, cells: p.cells, progress: p.progress });

export function Editor({ pattern }: { pattern: Pattern }) {
  const [tool, setTool] = useState<Tool>("fill");
  // Mirror axes in half-stitches from the left / top edge; null = off. Turning one on centres it.
  const [mirrorX, setMirrorX] = useState<number | null>(null);
  const [mirrorY, setMirrorY] = useState<number | null>(null);
  const toggleMirrorX = () => setMirrorX((m) => (m === null ? live.current.width : null));
  const toggleMirrorY = () => setMirrorY((m) => (m === null ? live.current.height : null));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selection, setSelection] = useState<Rect | null>(null);
  // Undo can shrink the chart under a selection, so only the part still on it counts.
  const sel = selection && clipRect(selection, pattern.width, pattern.height);
  const [anchor, setAnchor] = useState<Anchor>({ ax: 0, ay: 1 });
  // History lives in refs; `tick` re-renders so the undo/redo buttons update.
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, setTick] = useState(0);
  // Painting reads the latest pattern without waiting for a re-render.
  const live = useRef(pattern);
  live.current = pattern;
  const strokeValue = useRef(1);

  const update = useCallback((next: Partial<Pattern>) => {
    live.current = { ...live.current, ...next };
    savePattern(live.current);
  }, []);

  const checkpoint = useCallback(() => {
    past.current = [...past.current.slice(-99), snap(live.current)];
    future.current = [];
    setTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [snap(live.current), ...future.current];
    update(prev);
    setSelection(null);
    setTick((t) => t + 1);
  }, [update]);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, snap(live.current)];
    update(next);
    setSelection(null);
    setTick((t) => t + 1);
  }, [update]);

  /** (x, y) and its mirror images, given which mirrors are on. Images off the chart are dropped. */
  const mirrored = (p: Pattern, x: number, y: number) => {
    const xs = mirrorX === null ? [x] : [x, mirrorX - 1 - x].filter((v) => v >= 0 && v < p.width);
    const ys = mirrorY === null ? [y] : [y, mirrorY - 1 - y].filter((v) => v >= 0 && v < p.height);
    return ys.flatMap((ty) => xs.map((tx) => ({ x: tx, y: ty })));
  };

  const paint = (x: number, y: number) => {
    const p = live.current;
    const targets = mirrored(p, x, y).map((c) => c.y * p.width + c.x);
    if (targets.every((i) => p.cells[i] === strokeValue.current)) return;
    const cells = p.cells.slice();
    for (const i of targets) cells[i] = strokeValue.current;
    update({ cells });
  };

  const onCellDown = (x: number, y: number, button: number) => {
    const p = live.current;
    checkpoint();
    if (tool === "bucket") {
      const value = p.cells[y * p.width + x] ? 0 : 1;
      const cells = mirrored(p, x, y).reduce((acc, c) => floodFill(acc, p.width, p.height, c.x, c.y, value), p.cells);
      update({ cells });
      return;
    }
    // Right-click always lays chains, whichever tool is picked.
    strokeValue.current = button === 2 || tool === "chain" ? 0 : 1;
    paint(x, y);
  };

  const setSize = (width: number, height: number) => {
    if (width === pattern.width && height === pattern.height) return;
    checkpoint();
    const dx = Math.floor((width - pattern.width) * anchor.ax);
    const dy = Math.floor((height - pattern.height) * anchor.ay);
    // Mirror axes move with the stitches they were on.
    if (mirrorX !== null) setMirrorX(Math.max(1, Math.min(2 * width - 1, mirrorX + 2 * dx)));
    if (mirrorY !== null) setMirrorY(Math.max(1, Math.min(2 * height - 1, mirrorY + 2 * dy)));
    setSelection(null);
    update(resize(live.current, width, height, dx, dy));
  };

  /** Shift the selection, or the whole chart when nothing is selected. */
  const nudge = (dx: number, dy: number) => {
    const p = live.current;
    const rect = sel ?? { x: 0, y: 0, w: p.width, h: p.height };
    checkpoint();
    update({ cells: moveCells(p.cells, p.width, p.height, rect, dx, dy) });
    if (sel) setSelection(clipRect({ ...sel, x: sel.x + dx, y: sel.y + dy }, p.width, p.height));
  };

  type Drag = { kind: "marquee"; from: Cell } | { kind: "move"; from: Cell; base: number[]; rect: Rect; selected: boolean; moved: boolean };
  const dragging = useRef<Drag | null>(null);
  const onChart = (c: Cell) => ({
    x: Math.max(0, Math.min(live.current.width - 1, c.x)),
    y: Math.max(0, Math.min(live.current.height - 1, c.y)),
  });
  const dragTool =
    tool === "select" || tool === "move"
      ? {
          cursor: tool === "move" ? "move" : "crosshair",
          start: (c: Cell) => {
            const p = live.current;
            const inside = sel && c.x >= sel.x && c.x < sel.x + sel.w && c.y >= sel.y && c.y < sel.y + sel.h;
            if (tool === "move" || inside) {
              const rect = sel ?? { x: 0, y: 0, w: p.width, h: p.height };
              dragging.current = { kind: "move", from: c, base: p.cells, rect, selected: Boolean(sel), moved: false };
            } else {
              // A click without a drag just clears the selection.
              dragging.current = { kind: "marquee", from: onChart(c) };
              setSelection(null);
            }
          },
          move: (c: Cell) => {
            const d = dragging.current;
            if (!d) return;
            if (d.kind === "marquee") {
              const b = onChart(c);
              setSelection({ x: Math.min(d.from.x, b.x), y: Math.min(d.from.y, b.y), w: Math.abs(d.from.x - b.x) + 1, h: Math.abs(d.from.y - b.y) + 1 });
              return;
            }
            const p = live.current;
            const dx = c.x - d.from.x;
            const dy = c.y - d.from.y;
            if (!d.moved) {
              checkpoint();
              d.moved = true;
            }
            // Always from where the drag started, so stitches dragged off the edge and back survive.
            update({ cells: moveCells(d.base, p.width, p.height, d.rect, dx, dy) });
            if (d.selected) setSelection(clipRect({ ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }, p.width, p.height));
          },
          end: () => {
            dragging.current = null;
          },
        }
      : undefined;

  // Re-bound each render: nudging and deleting read the current tool and selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelection({ x: 0, y: 0, w: live.current.width, h: live.current.height });
      } else if (e.key === "Escape") {
        setSelection(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        const p = live.current;
        checkpoint();
        const cells = p.cells.slice();
        for (let y = sel.y; y < sel.y + sel.h; y++) cells.fill(0, y * p.width + sel.x, y * p.width + sel.x + sel.w);
        update({ cells });
      } else if (e.key.startsWith("Arrow") && (tool === "select" || tool === "move")) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        const [dx, dy] = { ArrowLeft: [-n, 0], ArrowRight: [n, 0], ArrowUp: [0, -n], ArrowDown: [0, n] }[e.key] ?? [0, 0];
        nudge(dx, dy);
      } else if (!mod) {
        const t = TOOLS.find((t) => t.key === e.key.toLowerCase());
        if (t) setTool(t.id);
        if (e.key.toLowerCase() === "m") (e.shiftKey ? toggleMirrorY : toggleMirrorX)();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const fills = pattern.cells.reduce((n, c) => n + c, 0);

  const settings = (
    <>
      <TextField label="Pattern name" value={pattern.name} onChange={(name) => update({ name })} />

      {/* Remounts on resize (and undo) so the draft starts from the chart's real size. */}
      <CanvasSize
        key={`${pattern.width}x${pattern.height}`}
        width={pattern.width}
        height={pattern.height}
        hasProgress={pattern.progress > 0}
        anchor={anchor}
        onAnchor={setAnchor}
        onApply={setSize}
      />

      <Panel title="Stitches">
        <Legend fill label="Fill — full square" count={fills} />
        <Legend label="Chain — open square" count={pattern.cells.length - fills} />
        <p className="text-[12px] text-muted-foreground max-md:hidden">Right-click to lay chains with any tool.</p>
      </Panel>

      <Panel title="Preview">
        <div className="grid min-h-[140px] place-items-center bg-muted p-3">
          <Thumbnail pattern={pattern} maxWidth={220} maxHeight={200} />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={Contrast}
          onClick={() => {
            checkpoint();
            update({ cells: pattern.cells.map((c) => 1 - c) });
          }}
        >
          Invert
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={Trash2}
          onClick={() => {
            checkpoint();
            update({ cells: pattern.cells.map(() => 0) });
          }}
        >
          Clear
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader crumb={pattern.name}>
        <Button collapse variant="outline" icon={Download} onClick={() => downloadPattern(pattern)}>
          Export .knitpx
        </Button>
        <Button collapse icon={Play} onClick={() => navigate({ name: "track", id: pattern.id })}>
          {pattern.progress > 0 ? "Continue crocheting" : "Start crocheting"}
        </Button>
      </AppHeader>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label="Tools"
          className="order-last flex shrink-0 items-center gap-2 overflow-x-auto border-t-2 bg-sidebar px-3 py-2 md:order-none md:flex-col md:items-stretch md:border-t-0 md:border-r-2 md:p-4"
        >
          {TOOLS.map((t) => (
            <IconButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} onClick={() => setTool(t.id)} />
          ))}
          <IconButton icon={TrianglesCenterlineDashedVertical} label="Mirror left and right (M)" active={mirrorX !== null} onClick={toggleMirrorX} />
          <IconButton icon={TrianglesCenterlineDashedHorizontal} label="Mirror top and bottom (⇧M)" active={mirrorY !== null} onClick={toggleMirrorY} />
          <hr className="h-8 border-l-2 md:my-1 md:h-auto md:border-t-2 md:border-l-0" />
          <IconButton icon={Undo2} label="Undo (⌘Z)" disabled={!past.current.length} onClick={undo} />
          <IconButton icon={Redo2} label="Redo (⇧⌘Z)" disabled={!future.current.length} onClick={redo} />
          <IconButton className="ml-auto md:hidden" icon={SlidersHorizontal} label="Name, size and preview" onClick={() => setSheetOpen(true)} />
        </nav>

        <div className="relative flex min-w-0 flex-1 flex-col bg-muted">
          <ChartCanvas
            pattern={pattern}
            panOnDrag={tool === "pan"}
            mirrorX={mirrorX ?? undefined}
            mirrorY={mirrorY ?? undefined}
            onMirrorMove={(axis, pos) => (axis === "x" ? setMirrorX : setMirrorY)(pos)}
            selection={sel ?? undefined}
            drag={dragTool}
            onCellDown={onCellDown}
            onCellDrag={tool === "bucket" ? undefined : paint}
          />
          {(mirrorX !== null || mirrorY !== null) && (
            // Top-left, clear of the handle above a centred axis.
            <span className="label-caps pointer-events-none absolute top-3 left-3 border bg-accent px-2 py-0.5 text-accent-foreground">
              {mirrorX !== null && mirrorY !== null ? "Mirror 4-way" : mirrorX !== null ? "Mirror left–right" : "Mirror top–bottom"}
            </span>
          )}
        </div>

        <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l-2 bg-sidebar p-5 max-md:hidden">{settings}</aside>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/40 md:hidden" onClick={() => setSheetOpen(false)}>
          <div
            role="dialog"
            aria-label="Pattern settings"
            className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto border-t-2 bg-sidebar p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="label-caps">Pattern</span>
              <IconButton size="sm" bordered={false} icon={X} label="Close" onClick={() => setSheetOpen(false)} />
            </div>
            {settings}
          </div>
        </div>
      )}
    </div>
  );
}

const ANCHORS = [0, 0.5, 1].flatMap((ay) => [0, 0.5, 1].map((ax) => ({ ax, ay })));
const SIDE = { x: ["on the right", "on both sides", "on the left"], y: ["at the bottom", "top and bottom", "on top"] };

function CanvasSize({
  width,
  height,
  hasProgress,
  anchor,
  onAnchor,
  onApply,
}: {
  width: number;
  height: number;
  hasProgress: boolean;
  anchor: Anchor;
  onAnchor: (a: Anchor) => void;
  onApply: (width: number, height: number) => void;
}) {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const changed = w !== width || h !== height;
  // Same offsets as setSize: progress survives only if the bottom-left corner stays put.
  const losesProgress = hasProgress && (Math.floor((w - width) * anchor.ax) !== 0 || Math.floor((h - height) * anchor.ay) !== h - height);
  return (
    <Panel title="Canvas size">
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper label="Width" value={w} min={MIN_SIZE} max={MAX_SIZE} onChange={setW} />
        <NumberStepper label="Height" value={h} min={MIN_SIZE} max={MAX_SIZE} onChange={setH} />
      </div>
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Anchor" className="grid shrink-0 grid-cols-3 gap-px border-2 bg-border">
          {ANCHORS.map((a) => {
            const on = a.ax === anchor.ax && a.ay === anchor.ay;
            return (
              <button
                key={`${a.ax},${a.ay}`}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Keep the art ${a.ay === 0 ? "top" : a.ay === 1 ? "bottom" : "middle"} ${a.ax === 0 ? "left" : a.ax === 1 ? "right" : "centre"}`}
                onClick={() => onAnchor(a)}
                className={"size-6 focus-visible:outline-2 focus-visible:outline-ring " + (on ? "bg-foreground" : "bg-card hover:bg-accent")}
              />
            );
          })}
        </div>
        <p className="text-[12px] text-muted-foreground">
          The art stays at the black square. Rows change {SIDE.y[anchor.ay * 2]}, stitches {SIDE.x[anchor.ax * 2]}.
        </p>
      </div>
      {losesProgress && <p className="text-[12px] text-muted-foreground">The bottom-left corner moves, so this resets your crochet progress.</p>}
      <Button size="sm" variant="outline" disabled={!changed} onClick={() => onApply(w, h)}>
        {changed ? `Resize to ${w} × ${h}` : "Resize"}
      </Button>
    </Panel>
  );
}

function Legend({ fill, label, count }: { fill?: boolean; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={"size-[18px] shrink-0 border " + (fill ? "border-black bg-black" : "border-black bg-white")} />
      <span className="flex-1">{label}</span>
      <span className="font-mono">{count}</span>
    </div>
  );
}
