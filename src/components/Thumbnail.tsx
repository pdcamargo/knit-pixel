import { useEffect, useRef } from "react";
import type { Pattern } from "../lib/pattern";

/** The chart at one canvas pixel per stitch, scaled up crisply to fit the box. */
export function Thumbnail({ pattern, maxWidth, maxHeight }: { pattern: Pattern; maxWidth: number; maxHeight: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height, cells } = pattern;

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    for (let i = 0; i < cells.length; i++) {
      const v = cells[i] ? 0 : 255;
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, [width, height, cells]);

  const fit = Math.min(maxWidth / width, maxHeight / height);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width: width * scale, height: height * scale, imageRendering: "pixelated" }}
      className="block"
    />
  );
}
