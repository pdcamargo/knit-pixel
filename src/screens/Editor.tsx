import { useCallback, useEffect, useRef, useState } from "react";
import { Contrast, Download, Eraser, Hand, PaintBucket, Pencil, Play, Redo2, SlidersHorizontal, Trash2, TrianglesCenterlineDashedHorizontal, TrianglesCenterlineDashedVertical, Undo2, X } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { ChartCanvas } from "../components/ChartCanvas";
import { Thumbnail } from "../components/Thumbnail";
import { Button, IconButton, NumberStepper, Panel, TextField } from "../components/ui";
import { downloadPattern } from "../lib/files";
import { floodFill, MAX_SIZE, MIN_SIZE, resize, type Pattern } from "../lib/pattern";
import { navigate } from "../lib/router";
import { savePattern } from "../lib/store";

type Tool = "fill" | "chain" | "bucket" | "pan";
type Snapshot = Pick<Pattern, "width" | "height" | "cells" | "progress">;

const TOOLS = [
  { id: "fill", icon: Pencil, label: "Fill — full square (P)", key: "p" },
  { id: "chain", icon: Eraser, label: "Chain — open square (E)", key: "e" },
  { id: "bucket", icon: PaintBucket, label: "Bucket — swap a connected area (B)", key: "b" },
  { id: "pan", icon: Hand, label: "Hand — drag to move around (H, or hold Space)", key: "h" },
] as const;

const snap = (p: Pattern): Snapshot => ({ width: p.width, height: p.height, cells: p.cells, progress: p.progress });

export function Editor({ pattern }: { pattern: Pattern }) {
  const [tool, setTool] = useState<Tool>("fill");
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    setTick((t) => t + 1);
  }, [update]);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, snap(live.current)];
    update(next);
    setTick((t) => t + 1);
  }, [update]);

  /** (x, y) and its mirror images, given which mirrors are on. */
  const mirrored = (p: Pattern, x: number, y: number) => {
    const xs = mirrorX ? [x, p.width - 1 - x] : [x];
    const ys = mirrorY ? [y, p.height - 1 - y] : [y];
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
    update(resize(live.current, width, height));
  };

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
      } else if (!mod) {
        const t = TOOLS.find((t) => t.key === e.key.toLowerCase());
        if (t) setTool(t.id);
        if (e.key.toLowerCase() === "m") (e.shiftKey ? setMirrorY : setMirrorX)((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const fills = pattern.cells.reduce((n, c) => n + c, 0);

  const settings = (
    <>
      <TextField label="Pattern name" value={pattern.name} onChange={(name) => update({ name })} />

      <Panel title="Canvas size">
        <div className="grid grid-cols-2 gap-3">
          <NumberStepper label="Width" value={pattern.width} min={MIN_SIZE} max={MAX_SIZE} onChange={(w) => setSize(w, pattern.height)} />
          <NumberStepper label="Height" value={pattern.height} min={MIN_SIZE} max={MAX_SIZE} onChange={(h) => setSize(pattern.width, h)} />
        </div>
        <p className="text-[12px] text-muted-foreground">Rows are added on top, stitches on the right. The bottom-left corner stays put.</p>
      </Panel>

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
          <IconButton icon={TrianglesCenterlineDashedVertical} label="Mirror left and right (M)" active={mirrorX} onClick={() => setMirrorX(!mirrorX)} />
          <IconButton icon={TrianglesCenterlineDashedHorizontal} label="Mirror top and bottom (⇧M)" active={mirrorY} onClick={() => setMirrorY(!mirrorY)} />
          <hr className="h-8 border-l-2 md:my-1 md:h-auto md:border-t-2 md:border-l-0" />
          <IconButton icon={Undo2} label="Undo (⌘Z)" disabled={!past.current.length} onClick={undo} />
          <IconButton icon={Redo2} label="Redo (⇧⌘Z)" disabled={!future.current.length} onClick={redo} />
          <IconButton className="ml-auto md:hidden" icon={SlidersHorizontal} label="Name, size and preview" onClick={() => setSheetOpen(true)} />
        </nav>

        <div className="relative flex min-w-0 flex-1 flex-col bg-muted">
          <ChartCanvas
            pattern={pattern}
            panOnDrag={tool === "pan"}
            mirrorX={mirrorX}
            mirrorY={mirrorY}
            onCellDown={onCellDown}
            onCellDrag={tool === "bucket" ? undefined : paint}
          />
          {(mirrorX || mirrorY) && (
            <span className="label-caps pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 border bg-accent px-2 py-0.5 text-accent-foreground">
              {mirrorX && mirrorY ? "Mirror 4-way" : mirrorX ? "Mirror left–right" : "Mirror top–bottom"}
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

function Legend({ fill, label, count }: { fill?: boolean; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={"size-[18px] shrink-0 border " + (fill ? "border-black bg-black" : "border-black bg-white")} />
      <span className="flex-1">{label}</span>
      <span className="font-mono">{count}</span>
    </div>
  );
}
