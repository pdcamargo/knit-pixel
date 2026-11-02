import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { stitchToCell, totalStitches, type Pattern } from "../lib/pattern";
import { IconButton } from "./ui";

// Chart colours are paper and ink in both themes (see the design system brief).
const C = {
  frame: "#000000",
  fill: "#000000",
  chain: "#ffffff",
  grid: "#b3b3b3",
  gridMajor: "#666666",
  doneFill: { base: "#3d3d3d", hatch: "#9a9a9a" },
  doneChain: { base: "#ffffff", hatch: "#bdbdbd" },
  current: "#ffbf00",
  row: "#db0000",
  // Blue isn't in the palette, so it can't be mistaken for a stitch, the current row or the cursor.
  mirror: "#2563eb",
};

const GUTTER = 36;
/** Mirror handle size, and how far past the chart edge it sits, in CSS px. */
const HANDLE = 14;
const MIN_CELL = 2;
const MAX_CELL = 96;
// How far a press may wander and still count as a tap, in CSS px.
const TAP_SLOP = { mouse: 6, touch: 12 } as const;

type Cell = { x: number; y: number };
/** cell: stitch size in CSS px (may be fractional while zooming). ox/oy: chart's top-left in the viewport. */
type View = { cell: number; ox: number; oy: number };

type Props = {
  pattern: Pattern;
  /** Track mode: finished stitch count. The stitch at this index is the current one. */
  progress?: number;
  /** Drag pans instead of painting. A tap still reports onCellTap. */
  panOnDrag?: boolean;
  /**
   * Mirror axes in half-stitches from the left / top edge (so `width` is the middle), or
   * undefined when off. Drawn with drag handles that report new positions via onMirrorMove.
   */
  mirrorX?: number;
  mirrorY?: number;
  onMirrorMove?: (axis: "x" | "y", pos: number) => void;
  onCellDown?: (x: number, y: number, button: number) => void;
  /** Called for every cell the pointer crosses while pressed, gaps filled in. */
  onCellDrag?: (x: number, y: number) => void;
  onStrokeEnd?: () => void;
  onCellTap?: (x: number, y: number) => void;
};

const metrics = (cell: number) => {
  const c = Math.max(MIN_CELL, Math.round(cell));
  const gap = c >= 7 ? 1 : 0;
  return { c, gap, step: c + gap };
};

export function ChartCanvas({ pattern, progress, panOnDrag, mirrorX, mirrorY, onMirrorMove, onCellDown, onCellDrag, onStrokeEnd, onCellTap }: Props) {
  const { width: w, height: h, cells } = pattern;
  const tracking = progress !== undefined;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // null = fit to the viewport, and keep fitting as it resizes.
  const [userView, setUserView] = useState<View | null>(null);
  // Hover is drawn by moving a div directly, so mouse moves never re-render or repaint the chart.
  const hoverRef = useRef<HTMLDivElement>(null);
  const hideHover = () => hoverRef.current?.style.setProperty("display", "none");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [themeTick, setThemeTick] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const gutter = tracking ? GUTTER : 0;
  const fitView = useMemo<View>(() => {
    const pad = size.width < 640 ? 16 : 32;
    const s = Math.min((size.width - pad * 2 - gutter - 1) / w, (size.height - pad * 2 - 1) / h);
    const step = Math.max(MIN_CELL, Math.min(44, Math.floor(s)));
    const cell = step >= 8 ? step - 1 : step;
    const m = metrics(cell);
    return {
      cell,
      ox: (size.width - gutter - (w * m.step + m.gap)) / 2,
      oy: (size.height - (h * m.step + m.gap)) / 2,
    };
  }, [size.width, size.height, w, h, gutter]);

  const view = userView ?? fitView;
  const viewRef = useRef(view);
  viewRef.current = view;
  const { c: cell, gap, step } = metrics(view.cell);
  const ox = Math.round(view.ox);
  const oy = Math.round(view.oy);
  const chartW = w * step + gap;
  const chartH = h * step + gap;

  // Keep at least a corner of the chart on screen.
  const clamp = useCallback(
    (v: View): View => {
      const m = metrics(v.cell);
      const cw = w * m.step + m.gap;
      const ch = h * m.step + m.gap;
      const keep = 48;
      return {
        cell: v.cell,
        ox: Math.min(size.width - keep, Math.max(keep - cw, v.ox)),
        oy: Math.min(size.height - keep, Math.max(keep - ch, v.oy)),
      };
    },
    [w, h, size.width, size.height],
  );

  const zoomAt = useCallback(
    (factor: number, px: number, py: number, dx = 0, dy = 0) => {
      const cur = viewRef.current;
      hideHover();
      const nextCell = Math.max(MIN_CELL, Math.min(MAX_CELL, cur.cell * factor));
      const a = metrics(cur.cell).step;
      const b = metrics(nextCell).step;
      setUserView(clamp({ cell: nextCell, ox: px - ((px - cur.ox) / a) * b + dx, oy: py - ((py - cur.oy) / a) * b + dy }));
    },
    [clamp],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    const cur = viewRef.current;
    hideHover();
    setUserView(clamp({ ...cur, ox: cur.ox + dx, oy: cur.oy + dy }));
  }, [clamp]);

  const zoomStep = (dir: 1 | -1) => zoomAt(dir > 0 ? 1.4 : 1 / 1.4, size.width / 2, size.height / 2);

  const currentRow = tracking ? Math.floor(progress / w) : -1;
  const current = tracking && progress < totalStitches(pattern) ? stitchToCell(w, h, progress) : null;

  // When zoomed in, follow the current stitch as it moves off screen.
  useEffect(() => {
    if (!current || !userView) return;
    const v = viewRef.current;
    const m = metrics(v.cell);
    const cx = v.ox + m.gap + current.x * m.step;
    const cy = v.oy + m.gap + current.y * m.step;
    const margin = m.step * 2;
    if (cx < margin || cy < margin || cx > size.width - gutter - margin || cy > size.height - margin) {
      setUserView(clamp({ ...v, ox: (size.width - gutter) / 2 - m.gap - current.x * m.step, oy: size.height / 2 - current.y * m.step }));
    }
    // Only when the stitch moves, not when the user pans.
  }, [progress]);

  // Handles sit just outside the chart, pulled back on screen when it's zoomed past the edge.
  const mirrorHandles = () => {
    const out: { axis: "x" | "y"; x: number; y: number }[] = [];
    const onScreen = (v: number, max: number) => Math.min(max - HANDLE, Math.max(HANDLE, v));
    if (mirrorX !== undefined) {
      const x = ox + gap / 2 + (mirrorX / 2) * step;
      out.push({ axis: "x", x, y: onScreen(oy - HANDLE, size.height) }, { axis: "x", x, y: onScreen(oy + chartH + HANDLE, size.height) });
    }
    if (mirrorY !== undefined) {
      const y = oy + gap / 2 + (mirrorY / 2) * step;
      out.push({ axis: "y", x: onScreen(ox - HANDLE, size.width), y }, { axis: "y", x: onScreen(ox + chartW + HANDLE, size.width), y });
    }
    return out;
  };
  const handleAt = (p: { x: number; y: number }, slop: number) =>
    onMirrorMove ? mirrorHandles().find((hd) => Math.abs(p.x - hd.x) <= HANDLE / 2 + slop && Math.abs(p.y - hd.y) <= HANDLE / 2 + slop) : undefined;

  // ---------- drawing ----------
  const cache = useRef<{ key: string; fill: CanvasPattern; chain: CanvasPattern } | null>(null);
  const fgCache = useRef<{ tick: number; color: string } | null>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    // Resizing the backing store reallocates it, so only do it when the size actually changes.
    const bw = Math.round(size.width * dpr);
    const bh = Math.round(size.height * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    ctx.fillStyle = C.frame;
    ctx.fillRect(ox - 2, oy - 2, chartW + 4, chartH + 4);
    ctx.fillStyle = gap ? C.grid : C.chain;
    ctx.fillRect(ox, oy, chartW, chartH);

    const x0 = Math.max(0, Math.floor(-ox / step));
    const x1 = Math.min(w, Math.ceil((size.width - ox) / step));
    const y0 = Math.max(0, Math.floor(-oy / step));
    const y1 = Math.min(h, Math.ceil((size.height - oy) / step));

    let hatchFill: CanvasPattern | null = null;
    let hatchChain: CanvasPattern | null = null;
    if (tracking) {
      const key = `${cell}@${dpr}`;
      if (cache.current?.key !== key) {
        cache.current = { key, fill: hatch(ctx, C.doneFill, cell, dpr), chain: hatch(ctx, C.doneChain, cell, dpr) };
      }
      hatchFill = cache.current.fill;
      hatchChain = cache.current.chain;
    }
    const done = progress ?? 0;

    for (let y = y0; y < y1; y++) {
      const row = h - 1 - y;
      for (let x = x0; x < x1; x++) {
        const fill = cells[y * w + x] === 1;
        let style: string | CanvasPattern = fill ? C.fill : C.chain;
        if (tracking && row * w + (row % 2 === 0 ? x : w - 1 - x) < done) style = fill ? hatchFill! : hatchChain!;
        ctx.fillStyle = style;
        ctx.fillRect(ox + gap + x * step, oy + gap + y * step, cell, cell);
      }
    }

    // Every 10th line darker, counted from the bottom-left where work starts.
    if (gap) {
      ctx.fillStyle = C.gridMajor;
      for (let x = 10; x < w; x += 10) ctx.fillRect(ox + x * step, oy, gap, chartH);
      for (let r = 10; r < h; r += 10) ctx.fillRect(ox, oy + (h - r) * step, chartW, gap);
    }

    // Mirror axes run handle to handle, past the frame, so they stay visible over solid fills.
    const handles = mirrorHandles();
    if (handles.length) {
      const lw = Math.max(2, Math.min(4, Math.round(step / 6)));
      ctx.fillStyle = C.mirror;
      for (let i = 0; i < handles.length; i += 2) {
        const [a, b] = [handles[i], handles[i + 1]];
        if (a.axis === "x") ctx.fillRect(Math.round(a.x - lw / 2), a.y, lw, b.y - a.y);
        else ctx.fillRect(a.x, Math.round(a.y - lw / 2), b.x - a.x, lw);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.frame;
      for (const hd of handles) {
        ctx.fillRect(Math.round(hd.x - HANDLE / 2), Math.round(hd.y - HANDLE / 2), HANDLE, HANDLE);
        ctx.strokeRect(Math.round(hd.x - HANDLE / 2) + 1, Math.round(hd.y - HANDLE / 2) + 1, HANDLE - 2, HANDLE - 2);
      }
    }

    if (tracking && currentRow < h) {
      ctx.strokeStyle = C.row;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + 1, oy + (h - 1 - currentRow) * step + gap / 2, chartW - 2, step);
    }
    if (current) {
      const ring = Math.max(2, Math.round(cell * 0.2));
      ctx.strokeStyle = C.current;
      ctx.lineWidth = ring;
      ctx.strokeRect(ox + gap + current.x * step + ring / 2, oy + gap + current.y * step + ring / 2, cell - ring, cell - ring);
    }

    // Row numbers to the right of the chart; every row when there's room, else every 5th.
    if (tracking) {
      const every = step >= 14 ? 1 : 5;
      if (fgCache.current?.tick !== themeTick) fgCache.current = { tick: themeTick, color: getComputedStyle(wrapRef.current!).color };
      const fg = fgCache.current.color;
      const fontPx = Math.min(11, Math.max(9, step - 3));
      ctx.font = `600 ${fontPx}px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = "middle";
      const lx = ox + chartW + 6;
      for (let y = y0; y < y1; y++) {
        const row = h - 1 - y;
        const isCurrent = row === currentRow;
        if (!isCurrent && (row + 1) % every !== 0 && row !== 0) continue;
        const cy = oy + gap + y * step + cell / 2;
        const label = String(row + 1);
        if (isCurrent) {
          const tw = ctx.measureText(label).width + 8;
          ctx.fillStyle = C.row;
          ctx.fillRect(lx, cy - Math.max(cell, 14) / 2, tw, Math.max(cell, 14));
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, lx + 4, cy);
        } else {
          ctx.globalAlpha = row < currentRow ? 0.45 : 1;
          ctx.fillStyle = fg;
          ctx.fillText(label, lx + 4, cy);
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  // Draw at most once per frame, however many updates land in it (a fast drag paints many cells).
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const frame = useRef(0);
  useEffect(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      drawRef.current();
    });
  });
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      // Reset so a remount (StrictMode does one in dev) can schedule again.
      frame.current = 0;
    },
    [],
  );

  const showHover = Boolean(onCellDown) && !panOnDrag;
  const moveHover = (c: Cell | null) => {
    const el = hoverRef.current;
    if (!el) return;
    if (!c || !showHover) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.transform = `translate(${ox + gap + c.x * step - 1}px, ${oy + gap + c.y * step - 1}px)`;
    el.style.width = el.style.height = `${cell + 2}px`;
  };

  // ---------- input ----------
  const cellAt = (px: number, py: number): Cell | null => {
    const x = Math.floor((px - ox - gap / 2) / step);
    const y = Math.floor((py - oy - gap / 2) / step);
    return x >= 0 && y >= 0 && x < w && y < h ? { x, y } : null;
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  type Gesture =
    | { kind: "paint"; last: Cell }
    | { kind: "mirror"; axis: "x" | "y" }
    | { kind: "pan"; origin: { x: number; y: number }; last: { x: number; y: number }; panning: boolean; slop: number; start: Cell | null }
    | { kind: "pinch"; dist: number; mid: { x: number; y: number } };
  const gesture = useRef<Gesture | null>(null);

  const twoFinger = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  const endPaint = () => {
    if (gesture.current?.kind === "paint") onStrokeEnd?.();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = local(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may already be gone (lifted mid-event); capture is only a nicety.
    }
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      endPaint();
      gesture.current = { kind: "pinch", ...twoFinger() };
      return;
    }
    if (pointers.current.size > 2) return;
    const handle = handleAt(p, e.pointerType === "mouse" ? 2 : 8);
    if (handle) {
      hideHover();
      gesture.current = { kind: "mirror", axis: handle.axis };
      return;
    }
    const c = cellAt(p.x, p.y);
    if (panOnDrag || spaceHeld || e.button === 1) {
      gesture.current = { kind: "pan", origin: p, last: p, panning: false, slop: e.pointerType === "mouse" ? TAP_SLOP.mouse : TAP_SLOP.touch, start: c };
    } else if (onCellDown && c) {
      gesture.current = { kind: "paint", last: c };
      onCellDown(c.x, c.y, e.button);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = local(e);
    if (e.pointerType === "mouse") {
      const handle = gesture.current ? undefined : handleAt(p, 2);
      const g = gesture.current?.kind;
      moveHover(handle || g === "pan" || g === "mirror" ? null : cellAt(p.x, p.y));
      // Set directly: hovering shouldn't re-render. React only rewrites cursor when its value changes.
      const axis = handle?.axis ?? (gesture.current?.kind === "mirror" ? gesture.current.axis : undefined);
      canvasRef.current!.style.cursor = axis === "x" ? "ew-resize" : axis === "y" ? "ns-resize" : cursor;
    }
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      if (pointers.current.size < 2) return;
      const t = twoFinger();
      zoomAt(t.dist / g.dist, t.mid.x, t.mid.y, t.mid.x - g.mid.x, t.mid.y - g.mid.y);
      gesture.current = { kind: "pinch", ...t };
    } else if (g.kind === "pan") {
      // Measured from where the press started, so a shaky click still counts as a click.
      if (!g.panning && Math.hypot(p.x - g.origin.x, p.y - g.origin.y) <= g.slop) return;
      if (!g.panning) {
        g.panning = true;
        g.last = g.origin;
      }
      panBy(p.x - g.last.x, p.y - g.last.y);
      g.last = p;
    } else if (g.kind === "mirror") {
      // Snap to half-stitches: on a grid line or through the middle of a stitch.
      const [pos, origin, n] = g.axis === "x" ? [p.x, ox, w] : [p.y, oy, h];
      const half = Math.max(1, Math.min(2 * n - 1, Math.round(((pos - origin - gap / 2) / step) * 2)));
      if (half !== (g.axis === "x" ? mirrorX : mirrorY)) onMirrorMove?.(g.axis, half);
    } else if (g.kind === "paint" && onCellDrag) {
      const c = cellAt(p.x, p.y);
      if (!c || (c.x === g.last.x && c.y === g.last.y)) return;
      for (const q of line(g.last, c).slice(1)) onCellDrag(q.x, q.y);
      g.last = c;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === "pan" && !g.panning && g.start && onCellTap) onCellTap(g.start.x, g.start.y);
    endPaint();
    // After a pinch, the finger still down does nothing until it lifts too.
    if (pointers.current.size === 0 || g?.kind !== "pinch") gesture.current = null;
  };

  // Wheel: pinch / ctrl+wheel zooms at the cursor, plain scroll pans. Needs a non-passive listener.
  useEffect(() => {
    const el = wrapRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? 16 : 1;
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * scale * 0.01), e.clientX - r.left, e.clientY - r.top);
      else panBy(-e.deltaX * scale, -e.deltaY * scale);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, panBy]);

  // Keyboard: + / - zoom, 0 fits, hold space to pan while painting.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") zoomAt(1.4, size.width / 2, size.height / 2);
      else if (e.key === "-") zoomAt(1 / 1.4, size.width / 2, size.height / 2);
      else if (e.key === "0") setUserView(null);
      else if (e.key === " " && !panOnDrag) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => e.key === " " && setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [zoomAt, size.width, size.height, panOnDrag]);

  const cursor = panOnDrag || spaceHeld ? (gesture.current?.kind === "pan" ? "grabbing" : "grab") : onCellDown ? "crosshair" : "default";

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden text-foreground">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, touchAction: "none", cursor }}
        className="block select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => moveHover(null)}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div ref={hoverRef} className="pointer-events-none absolute top-0 left-0 hidden border-2 border-primary" />
      <div className="absolute right-3 bottom-3 flex items-center gap-2">
        <IconButton size="sm" icon={ZoomOut} label="Zoom out (−)" disabled={view.cell <= MIN_CELL} onClick={() => zoomStep(-1)} />
        <IconButton size="sm" icon={Maximize} label="Fit to screen (0)" active={!userView} onClick={() => setUserView(null)} />
        <IconButton size="sm" icon={ZoomIn} label="Zoom in (+)" disabled={view.cell >= MAX_CELL} onClick={() => zoomStep(1)} />
      </div>
    </div>
  );
}

/** A cross-hatch tile for finished stitches, scaled to the stitch so it reads at any zoom. */
function hatch(ctx: CanvasRenderingContext2D, colors: { base: string; hatch: string }, cell: number, dpr: number) {
  const t = Math.max(4, Math.min(10, Math.round(cell / 3)));
  const tile = document.createElement("canvas");
  tile.width = tile.height = Math.round(t * dpr);
  const g = tile.getContext("2d")!;
  g.scale(dpr, dpr);
  g.fillStyle = colors.base;
  g.fillRect(0, 0, t, t);
  g.strokeStyle = colors.hatch;
  g.lineWidth = 1;
  g.beginPath();
  // Both diagonals, extended past the edges so the tiles join seamlessly.
  g.moveTo(-1, -1);
  g.lineTo(t + 1, t + 1);
  g.moveTo(t + 1, -1);
  g.lineTo(-1, t + 1);
  g.stroke();
  const pattern = ctx.createPattern(tile, "repeat")!;
  pattern.setTransform(new DOMMatrix().scale(1 / dpr));
  return pattern;
}

/** Cells on the straight line between a and b (Bresenham), both ends included. */
function line(a: Cell, b: Cell) {
  const out: Cell[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}
