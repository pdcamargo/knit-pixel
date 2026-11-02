import { describe, expect, it } from "vitest";
import { cellToStitch, fromBitmap, fromKnitpx, KnitpxError, resize, rowRuns, stitchToCell, toKnitpx } from "./pattern";

describe("serpentine order", () => {
  it("starts bottom-left, goes right, then back left one row up", () => {
    // 3 wide, 2 tall
    expect([0, 1, 2, 3, 4, 5].map((i) => stitchToCell(3, 2, i))).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("cellToStitch inverts stitchToCell", () => {
    for (let i = 0; i < 7 * 5; i++) {
      const { x, y } = stitchToCell(7, 5, i);
      expect(cellToStitch(7, 5, x, y)).toBe(i);
    }
  });
});

describe("rowRuns", () => {
  const p = fromBitmap("t", ["XX..X", "X...."]);
  it("reads row 1 left to right", () => {
    expect(rowRuns(p, 0).map((r) => [r.fill, r.count])).toEqual([
      [true, 1],
      [false, 4],
    ]);
  });
  it("reads row 2 right to left", () => {
    expect(rowRuns(p, 1).map((r) => [r.fill, r.count])).toEqual([
      [true, 1],
      [false, 2],
      [true, 2],
    ]);
  });
});

describe(".knitpx", () => {
  it("round-trips", () => {
    const p = fromBitmap("Heart", [".X.", "XXX", ".X."]);
    const back = fromKnitpx(toKnitpx(p));
    expect(back.name).toBe("Heart");
    expect([back.width, back.height]).toEqual([3, 3]);
    expect(back.cells).toEqual(p.cells);
  });

  it("carries progress only when asked", () => {
    const p = { ...fromBitmap("Heart", [".X.", "XXX"]), progress: 4 };
    expect(fromKnitpx(toKnitpx(p)).progress).toBe(0);
    const back = fromKnitpx(toKnitpx(p, { withProgress: true }));
    expect(back.progress).toBe(4);
    expect(back.id).toBe(p.id);
  });

  it("rejects progress past the last stitch", () => {
    const file = { format: "knitpx", version: 1, name: "x", rows: ["##"], progress: 3 };
    expect(() => fromKnitpx(JSON.stringify(file))).toThrow(/progress/);
  });

  it("rejects ragged rows and unknown characters", () => {
    const base = { format: "knitpx", version: 1, name: "x" };
    expect(() => fromKnitpx(JSON.stringify({ ...base, rows: ["##", "#"] }))).toThrow(KnitpxError);
    expect(() => fromKnitpx(JSON.stringify({ ...base, rows: ["#x"] }))).toThrow(/Unexpected character/);
    expect(() => fromKnitpx("{nope")).toThrow(/valid JSON/);
  });
});

describe("resize", () => {
  it("keeps the bottom-left corner in place", () => {
    const p = fromBitmap("t", ["X.", ".X"]);
    const r = resize(p, 3, 3);
    expect(r.cells).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it("keeps finished rows finished", () => {
    const p = { ...fromBitmap("t", ["....", "....", "...."]), progress: 9 }; // 2 rows + 1
    expect(resize(p, 6, 3).progress).toBe(13);
  });
});
