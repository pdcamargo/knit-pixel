// Generates the Knit Pixel design system documents (components, patterns, screens).
// Run from the repo root: node design/generate.mjs design
// It overwrites those files; tokens.json and guidelines/ are hand-written and left alone.
import { writeFileSync } from "node:fs";

const ROOT = process.argv[2];
const LOGO = "data:image/png;base64,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";
const write = (rel, doc) => writeFileSync(`${ROOT}/${rel}`, JSON.stringify(doc, null, 2) + "\n");
const m = (prop, cases) => ({ match: { prop }, cases });

// ---------- bitmaps (top row first, X = fill, . = chain) ----------
const B = {
  ace: [
    "..................",
    "..XX..............",
    ".X..X.............",
    ".XXXX.............",
    ".X..X.............",
    ".X..X.............",
    "..................",
    ".........X........",
    "........XXX.......",
    ".......XXXXX......",
    "......XXXXXXX.....",
    ".....XXXXXXXXX....",
    "....XXXXXXXXXXX...",
    "....XXXXXXXXXXX...",
    "....XXXXXXXXXXX...",
    ".....XXX.X.XXX....",
    ".........X........",
    "........XXX.......",
    ".......XXXXX......",
    "..................",
    ".............X..X.",
    ".............X..X.",
    ".............XXXX.",
    ".............X..X.",
    "..............XX..",
    "..................",
  ],
  heart: [
    "...............",
    "...XX.....XX...",
    "..XXXX...XXXX..",
    ".XXXXXX.XXXXXX.",
    ".XXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXX.",
    "..XXXXXXXXXXX..",
    "...XXXXXXXXX...",
    "....XXXXXXX....",
    ".....XXXXX.....",
    "......XXX......",
    ".......X.......",
    "...............",
  ],
  cat: [
    "..............",
    ".X.........X..",
    ".XX.......XX..",
    ".XXX.....XXX..",
    ".XXXXXXXXXXX..",
    ".XX..XXX..XX..",
    ".XX..XXX..XX..",
    ".XXXXXXXXXXX..",
    ".XXXXX.XXXXX..",
    "..XXXXXXXXX...",
    "...XXXXXXX..X.",
    "...XX...XX.X..",
    "...XX...XXX...",
    "..............",
  ],
  checker: [
    "X.X.X.X.X.X.X.X.X.X.",
    ".X.X.X.X.X.X.X.X.X.X",
    "X.X.X.X.X.X.X.X.X.X.",
    "....................",
    "XXXXXXXXXXXXXXXXXXXX",
    "....................",
    ".X.X.X.X.X.X.X.X.X.X",
    "X.X.X.X.X.X.X.X.X.X.",
  ],
};
const filled = (bmp, x, y) => bmp[y][x] === "X";

// Serpentine order from bottom-left: stitch index -> {x, y(top-based)}
const stitchIndex = (bmp, x, y) => {
  const h = bmp.length, w = bmp[0].length;
  const r = h - 1 - y; // row from bottom, 0-based
  const pos = r % 2 === 0 ? x : w - 1 - x;
  return r * w + pos;
};

// A pixel grid. progress = number of finished stitches (tracker), or null.
function pixelGrid(prefix, bmp, cell, { lines = true, progress = null, rowNumbers = false } = {}) {
  const h = bmp.length, w = bmp[0].length;
  const currentRow = progress == null ? -1 : Math.floor(progress / w);
  const rows = bmp.map((line, y) => ({
    id: `${prefix}-r${y}`,
    type: "box",
    layout: "stack",
    direction: "row",
    gap: lines ? "$space.px" : 0,
    children: [...line].map((_, x) => {
      const f = filled(bmp, x, y);
      let bg = f ? "$color.stitchFilled" : "$color.stitchChain";
      let border;
      if (progress != null) {
        const i = stitchIndex(bmp, x, y);
        if (i < progress) bg = f ? "$color.stitchDoneFilled" : "$color.stitchDone";
        if (i === progress) {
          bg = "$color.stitchCurrent";
          border = "$border.default";
        }
      }
      const node = { id: `${prefix}-${x}-${y}`, type: "box", width: cell, height: cell, background: bg };
      if (border) node.border = { width: 3, color: f ? "$color.black" : "$color.accent", style: "solid" };
      return node;
    }),
  }));
  const grid = {
    id: `${prefix}-grid`,
    type: "box",
    layout: "stack",
    direction: "column",
    gap: lines ? "$space.px" : 0,
    padding: lines ? "$space.px" : 0,
    background: lines ? "$color.stitchGrid" : "$color.stitchChain",
    border: lines ? "$border.default" : undefined,
    children: rows,
  };
  if (!lines) delete grid.border;
  if (!rowNumbers) return grid;
  const nums = {
    id: `${prefix}-nums`,
    type: "box",
    layout: "stack",
    direction: "column",
    gap: "$space.px",
    padding: [3, 0],
    children: bmp.map((_, y) => {
      const row = h - y;
      const active = row - 1 === currentRow;
      return {
        id: `${prefix}-n${y}`,
        type: "text",
        value: `${row}`,
        font: "$font.monoSmall",
        height: cell,
        width: 28,
        padding: [0, 4],
        color: active ? "$color.onAccent" : row - 1 < currentRow ? "$color.textMuted" : "$color.text",
        background: active ? "$color.accent" : "$color.transparent",
        textAlign: "center",
      };
    }),
  };
  return { id: `${prefix}-wrap`, type: "box", layout: "stack", direction: "row", gap: "$space.2", align: "start", children: [grid, nums] };
}

// ================= components/button =================
const Button = {
  description: "The one clickable action. Hard edge, hard shadow; pressing it sinks into the page.",
  props: {
    label: { type: "string", description: "Start with a verb: Export, Track, Save." },
    variant: { type: "enum", of: ["primary", "secondary", "outline", "ghost"], default: "primary" },
    size: { type: "enum", of: ["sm", "md", "lg"], default: "md" },
    state: { type: "enum", of: ["default", "hover", "pressed", "disabled"], default: "default" },
    icon: { type: "string", default: "plus", description: "Lucide icon name, shown when hasIcon." },
    hasIcon: { type: "boolean", default: false },
    iconOnly: { type: "boolean", default: false, description: "Phone headers: square, icon only. The label stays for screen readers." },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "row",
    align: "center",
    justify: "center",
    gap: m("iconOnly", { true: 0, false: m("hasIcon", { true: "$space.2", false: 0 }) }),
    width: m("iconOnly", { true: 40, false: null }),
    height: m("iconOnly", { true: 40, false: null }),
    padding: m("iconOnly", {
      true: 0,
      false: m("size", { sm: ["$space.1", "$space.3"], md: ["$space.2", "$space.4"], lg: ["$space.3", "$space.6"] }),
    }),
    background: {
      match: { prop: "variant" },
      cases: {
        primary: m("state", { default: "$color.accent", hover: "$color.accentHover", pressed: "$color.accentHover", disabled: "$color.accent" }),
        secondary: "$color.inverse",
        outline: m("state", { default: "$color.surface", hover: "$color.highlight", pressed: "$color.highlight", disabled: "$color.surface" }),
        ghost: m("state", { default: "$color.transparent", hover: "$color.surfaceSunken", pressed: "$color.surfaceSunken", disabled: "$color.transparent" }),
      },
    },
    border: m("variant", {
      primary: "$border.default",
      secondary: "$border.default",
      outline: "$border.default",
      ghost: { width: 2, color: "$color.transparent", style: "solid" },
    }),
    shadow: m("variant", {
      primary: m("state", { default: "$shadow.sm", hover: "$shadow.md", pressed: "$shadow.none", disabled: "$shadow.none" }),
      secondary: m("state", { default: "$shadow.sm", hover: "$shadow.md", pressed: "$shadow.none", disabled: "$shadow.none" }),
      outline: m("state", { default: "$shadow.sm", hover: "$shadow.md", pressed: "$shadow.none", disabled: "$shadow.none" }),
      ghost: "$shadow.none",
    }),
    opacity: m("state", { default: 1, hover: 1, pressed: 1, disabled: 0.4 }),
    children: [
      {
        // Collapsed to zero width when there is no icon.
        id: "iconWrap",
        type: "box",
        layout: "stack",
        width: m("hasIcon", { true: null, false: 0 }),
        overflow: "hidden",
        children: [
          {
            id: "icon",
            type: "icon",
            name: { prop: "icon" },
            size: m("size", { sm: 14, md: 16, lg: 18 }),
            color: m("variant", { primary: "$color.onAccent", secondary: "$color.onInverse", outline: "$color.text", ghost: "$color.text" }),
          },
        ],
      },
      {
        id: "label",
        type: "text",
        value: m("iconOnly", { true: "", false: { prop: "label" } }),
        font: "$font.button",
        color: m("variant", { primary: "$color.onAccent", secondary: "$color.onInverse", outline: "$color.text", ghost: "$color.text" }),
      },
    ],
  },
};

const IconButton = {
  description: "A square icon-only action. Tool pickers use it with active.",
  props: {
    icon: { type: "string" },
    active: { type: "boolean", default: false, description: "Selected tool: inverted fill." },
    size: { type: "enum", of: ["sm", "md"], default: "md" },
    bordered: { type: "boolean", default: true },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    align: "center",
    justify: "center",
    width: m("size", { sm: 32, md: 40 }),
    height: m("size", { sm: 32, md: 40 }),
    background: m("active", { true: "$color.inverse", false: "$color.surface" }),
    border: m("bordered", { true: "$border.default", false: { width: 2, color: "$color.transparent", style: "solid" } }),
    shadow: m("active", { true: "$shadow.none", false: m("bordered", { true: "$shadow.xs", false: "$shadow.none" }) }),
    children: [
      {
        id: "icon",
        type: "icon",
        name: { prop: "icon" },
        size: m("size", { sm: 16, md: 18 }),
        color: m("active", { true: "$color.onInverse", false: "$color.text" }),
      },
    ],
  },
};

const ButtonGroup = {
  description: "Buttons that belong together, in a row.",
  props: { items: { type: "slot" } },
  root: { id: "root", type: "box", layout: "stack", direction: "row", gap: "$space.3", align: "center", children: [{ slot: "items" }] },
};

const variants = ["primary", "secondary", "outline", "ghost"];
const states = ["default", "hover", "pressed", "disabled"];
const label = (id, value) => ({ id, type: "text", value, font: "$font.label", textTransform: "uppercase", color: "$color.textMuted" });

write("components/button.nyui.json", {
  schema: 3,
  name: "Button",
  meta: {
    group: "Actions",
    order: 1,
    status: "draft",
    description: "Buttons and icon buttons. Flat colour, 2px black border, 3px hard shadow.",
    usage: {
      do: ["One primary (red) button per surface: the thing you came here to do.", "Use outline for secondary actions like Import and Export.", "Use IconButton active for the selected editor tool."],
      dont: ["Round the corners. The system is square, like a stitch.", "Put two primary buttons side by side."],
    },
  },
  components: { Button, IconButton, ButtonGroup },
  artboards: [
    {
      id: "button-specimens",
      name: "Button — variants × states",
      size: { width: 760, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.6",
        padding: "$space.8",
        children: [
          {
            id: "head",
            type: "box",
            layout: "grid",
            columns: 5,
            gap: "$space.4",
            children: [label("h-0", ""), ...states.map((s) => label(`h-${s}`, s))],
          },
          ...variants.map((v) => ({
            id: `row-${v}`,
            type: "box",
            layout: "grid",
            columns: 5,
            gap: "$space.4",
            align: "center",
            children: [
              label(`l-${v}`, v),
              ...states.map((s) => ({ id: `b-${v}-${s}`, use: "Button", props: { label: "Export", variant: v, state: s }, alignSelf: "start" })),
            ],
          })),
          {
            id: "sizes",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.4",
            align: "center",
            children: [
              { id: "s-sm", use: "Button", props: { label: "Small", size: "sm" } },
              { id: "s-md", use: "Button", props: { label: "Medium", size: "md", hasIcon: true, icon: "plus" } },
              { id: "s-lg", use: "Button", props: { label: "Next stitch", size: "lg", hasIcon: true, icon: "arrow-right" } },
            ],
          },
          {
            id: "icons",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.3",
            align: "center",
            children: [
              { id: "i1", use: "IconButton", props: { icon: "pencil", active: true } },
              { id: "i2", use: "IconButton", props: { icon: "eraser" } },
              { id: "i3", use: "IconButton", props: { icon: "paint-bucket" } },
              { id: "i4", use: "IconButton", props: { icon: "undo-2", size: "sm" } },
              { id: "i5", use: "IconButton", props: { icon: "redo-2", size: "sm" } },
              { id: "i6", use: "IconButton", props: { icon: "ellipsis", bordered: false } },
            ],
          },
        ],
      },
    },
  ],
});

// ================= components/brand =================
const Logo = {
  description: "The yarn ball and the KNIT PIXEL wordmark. PIXEL is always red.",
  props: { size: { type: "enum", of: ["mark", "sm", "lg"], default: "sm", description: "mark: the yarn ball alone, for phone headers." } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "row",
    align: "center",
    gap: m("size", { mark: 0, sm: "$space.2", lg: "$space.3" }),
    children: [
      { id: "mark", type: "image", src: LOGO, width: m("size", { mark: 32, sm: 36, lg: 72 }), height: m("size", { mark: 32, sm: 36, lg: 72 }), fit: "contain" },
      {
        id: "word",
        type: "text",
        font: m("size", { mark: "$font.h3", sm: "$font.h3", lg: "$font.display" }),
        textTransform: "uppercase",
        value: m("size", { mark: "", sm: ["Knit ", { text: "Pixel", color: "$color.accent" }], lg: ["Knit ", { text: "Pixel", color: "$color.accent" }] }),
      },
    ],
  },
};
write("components/brand.nyui.json", {
  schema: 3,
  name: "Brand",
  meta: {
    group: "Foundations",
    order: 0,
    status: "draft",
    description: "Logo lockups and the colour story: ink black, paper white, yarn red, highlight yellow.",
    usage: { do: ["Put the small lockup top-left of every screen."], dont: ["Recolour the yarn ball.", "Set the wordmark in anything but Inter Black."] },
  },
  components: { Logo },
  artboards: [
    {
      id: "brand-specimens",
      name: "Brand — lockups and palette",
      size: { width: 760, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.8",
        padding: "$space.8",
        children: [
          { id: "lg", use: "Logo", props: { size: "lg" } },
          { id: "sm", use: "Logo", props: { size: "sm" } },
          { id: "mk", use: "Logo", props: { size: "mark" } },
          {
            id: "palette",
            type: "box",
            layout: "grid",
            columns: 6,
            gap: "$space.3",
            children: [
              ["ink", "$color.black", "Ink"],
              ["paper", "$color.white", "Paper"],
              ["yarn", "$color.accent", "Yarn red"],
              ["hi", "$color.highlight", "Highlight"],
              ["moss", "$color.moss.500", "Moss"],
              ["clay", "$color.clay.500", "Clay"],
            ].map(([k, c, n]) => ({
              id: `sw-${k}`,
              type: "box",
              layout: "stack",
              direction: "column",
              gap: "$space.2",
              children: [
                { id: `sw-${k}-c`, type: "box", height: 72, background: c, border: "$border.default", shadow: "$shadow.sm" },
                { id: `sw-${k}-n`, type: "text", value: n, font: "$font.smallStrong" },
              ],
            })),
          },
        ],
      },
    },
  ],
});

// ================= components/stitch =================
const StitchCell = {
  description: "One stitch on the chart. Fill is a full square, chain is an open square.",
  props: {
    state: { type: "enum", of: ["fill", "chain", "doneFill", "doneChain", "current"], default: "fill" },
    size: { type: "number", default: 24 },
  },
  root: {
    id: "root",
    type: "box",
    width: { prop: "size" },
    height: { prop: "size" },
    border: m("state", { current: "$border.default", fill: "$border.thin", chain: "$border.thin", doneFill: "$border.thin", doneChain: "$border.thin" }),
    background: m("state", {
      fill: "$color.stitchFilled",
      chain: "$color.stitchChain",
      doneFill: "$color.stitchDoneFilled",
      doneChain: "$color.stitchDone",
      current: "$color.stitchCurrent",
    }),
  },
};
const StitchRun = {
  description: "A run of identical stitches in a row's instructions: '9 fill'. Done runs fade, the active one is outlined.",
  props: {
    kind: { type: "enum", of: ["fill", "chain"] },
    count: { type: "string", description: "How many in the run, e.g. 9." },
    status: { type: "enum", of: ["todo", "active", "done"], default: "todo" },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "row",
    align: "center",
    gap: "$space.2",
    padding: ["$space.1", "$space.2"],
    border: m("status", { todo: "$border.default", active: "$border.accent", done: "$border.subtle" }),
    background: m("status", { todo: "$color.surface", active: "$color.highlightSubtle", done: "$color.surfaceSunken" }),
    shadow: m("status", { todo: "$shadow.none", active: "$shadow.xs", done: "$shadow.none" }),
    opacity: m("status", { todo: 1, active: 1, done: 0.5 }),
    children: [
      { id: "sw", type: "box", width: 14, height: 14, border: "$border.thin", background: m("kind", { fill: "$color.stitchFilled", chain: "$color.stitchChain" }) },
      { id: "n", type: "text", value: { prop: "count" }, font: "$font.mono" },
      { id: "k", type: "text", value: m("kind", { fill: "fill", chain: "chain" }), font: "$font.smallStrong" },
    ],
  },
};
const ZoomControls = {
  description: "Zoom out, fit, zoom in. Sits bottom-right over every chart. Fit is active until the user zooms or pans.",
  props: { fitted: { type: "boolean", default: true } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "row",
    gap: "$space.2",
    children: [
      { id: "out", use: "IconButton", props: { icon: "zoom-out", size: "sm" } },
      { id: "fit", use: "IconButton", props: { icon: "maximize", size: "sm", active: { prop: "fitted" } } },
      { id: "in", use: "IconButton", props: { icon: "zoom-in", size: "sm" } },
    ],
  },
};
const zoom = (id) => ({ id, use: "ZoomControls", position: "absolute", inset: { right: "$space.3", bottom: "$space.3" } });

write("components/stitch.nyui.json", {
  schema: 3,
  name: "Stitch",
  meta: {
    group: "Chart",
    order: 1,
    status: "draft",
    description: "The chart's vocabulary. Stitch colours never follow dark mode: a chart is paper and ink. Finished stitches are cross-hatched in the app (this canvas can only show their flat tone).",
    usage: {
      do: [
        "Draw grids with 1px gray lines, a darker line every 10 stitches from the bottom-left, and a 2px black frame.",
        "Highlight exactly one current stitch with a yellow ring.",
        "Cross-hatch finished stitches over a dark (fill) or white (chain) base, so both stay readable.",
      ],
      dont: ["Invert the chart in dark mode.", "Use red on the chart for anything but the active row marker."],
    },
  },
  components: { StitchCell, StitchRun, ZoomControls },
  artboards: [
    {
      id: "stitch-specimens",
      name: "Stitch — cells and runs",
      size: { width: 760, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.8",
        padding: "$space.8",
        children: [
          {
            id: "cells",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.6",
            children: ["fill", "chain", "doneFill", "doneChain", "current"].map((s) => ({
              id: `c-${s}`,
              type: "box",
              layout: "stack",
              direction: "column",
              gap: "$space.2",
              align: "center",
              children: [
                { id: `c-${s}-cell`, use: "StitchCell", props: { state: s, size: 40 } },
                label(`c-${s}-l`, s),
              ],
            })),
          },
          {
            id: "runs",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.2",
            wrap: true,
            children: [
              { id: "r1", use: "StitchRun", props: { kind: "chain", count: "3", status: "done" } },
              { id: "r2", use: "StitchRun", props: { kind: "fill", count: "9", status: "active" } },
              { id: "r3", use: "StitchRun", props: { kind: "chain", count: "3" } },
            ],
          },
          { id: "zc", use: "ZoomControls" },
          {
            id: "grids",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.8",
            align: "start",
            children: [pixelGrid("g1", B.heart, 16), pixelGrid("g2", B.heart, 16, { progress: 81, rowNumbers: true })],
          },
        ],
      },
    },
  ],
});

// ================= components/card =================
const Panel = {
  description: "A titled surface for a group of controls in a sidebar.",
  props: { title: { type: "string" }, body: { type: "slot" } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    gap: "$space.3",
    padding: "$space.4",
    background: "$color.surface",
    border: "$border.default",
    shadow: "$shadow.sm",
    children: [{ id: "title", type: "text", value: { prop: "title" }, font: "$font.label", textTransform: "uppercase" }, { slot: "body" }],
  },
};
const PatternCard = {
  description: "A pattern in the library: thumbnail, name, size and how far along it is.",
  props: {
    name: { type: "string" },
    size: { type: "string", description: "Width × height in stitches, e.g. 18 × 26." },
    status: { type: "enum", of: ["new", "progress", "done"], default: "new" },
    percent: { type: "string", default: "0%", description: "Progress, as a width percentage." },
    thumb: { type: "slot" },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    background: "$color.surface",
    border: "$border.default",
    shadow: "$shadow.md",
    children: [
      {
        id: "thumb",
        type: "box",
        layout: "stack",
        align: "center",
        justify: "center",
        height: 188,
        background: "$color.surfaceSunken",
        children: [{ slot: "thumb" }],
      },
      { id: "rule", type: "box", height: 2, background: "$color.border" },
      {
        id: "info",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.2",
        padding: "$space.3",
        children: [
          {
            id: "top",
            type: "box",
            layout: "stack",
            direction: "row",
            justify: "between",
            align: "center",
            gap: "$space.2",
            children: [
              { id: "name", type: "text", value: { prop: "name" }, font: "$font.h3", maxLines: 1 },
              { id: "size", type: "text", value: { prop: "size" }, font: "$font.monoSmall", color: "$color.textMuted", shrink: 0 },
            ],
          },
          {
            id: "status",
            use: "Badge",
            props: {
              label: m("status", { new: "Not started", progress: "In progress", done: "Finished" }),
              variant: m("status", { new: "neutral", progress: "highlight", done: "success" }),
            },
            alignSelf: "start",
          },
          { id: "bar", use: "ProgressBar", props: { value: { prop: "percent" } } },
        ],
      },
    ],
  },
};
write("components/card.nyui.json", {
  schema: 3,
  name: "Card",
  meta: {
    group: "Surfaces",
    order: 1,
    status: "draft",
    description: "Surfaces sit on the page with a black frame and a hard shadow, never a blur.",
    usage: { do: ["Use PatternCard only in the library grid.", "Use Panel for every sidebar group."], dont: ["Nest a Panel inside a Panel."] },
  },
  components: { Panel, PatternCard },
  artboards: [
    {
      id: "card-specimens",
      name: "Card — pattern cards and panel",
      size: { width: 860, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.8",
        padding: "$space.8",
        children: [
          {
            id: "cards",
            type: "box",
            layout: "grid",
            columns: 3,
            gap: "$space.6",
            children: [
              { id: "pc1", use: "PatternCard", props: { name: "Ace of spades", size: "18 × 26", status: "progress", percent: "38%" }, slots: { thumb: [pixelGrid("t1", B.ace, 6, { lines: false })] } },
              { id: "pc2", use: "PatternCard", props: { name: "Heart", size: "15 × 13", status: "done", percent: "100%" }, slots: { thumb: [pixelGrid("t2", B.heart, 9, { lines: false })] } },
              { id: "pc3", use: "PatternCard", props: { name: "Sitting cat", size: "14 × 14", status: "new" }, slots: { thumb: [pixelGrid("t3", B.cat, 9, { lines: false })] } },
            ],
          },
          {
            id: "panel",
            use: "Panel",
            props: { title: "Canvas size" },
            width: 300,
            slots: { body: [{ id: "p-t", type: "text", value: "Panel content goes here.", font: "$font.small", color: "$color.textMuted" }] },
          },
        ],
      },
    },
  ],
});

// ================= components/feedback =================
const Badge = {
  description: "A small status label. Uppercase, tight, boxed.",
  props: {
    label: { type: "string" },
    variant: { type: "enum", of: ["neutral", "accent", "highlight", "success", "inverse"], default: "neutral" },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "row",
    align: "center",
    padding: ["$space.xs", "$space.2"],
    border: "$border.thin",
    background: m("variant", { neutral: "$color.surface", accent: "$color.accent", highlight: "$color.highlight", success: "$color.success", inverse: "$color.inverse" }),
    children: [
      {
        id: "label",
        type: "text",
        value: { prop: "label" },
        font: "$font.label",
        textTransform: "uppercase",
        color: m("variant", { neutral: "$color.text", accent: "$color.onAccent", highlight: "$color.onHighlight", success: "$color.white", inverse: "$color.onInverse" }),
      },
    ],
  },
};
const ProgressBar = {
  description: "How far along a pattern is. A framed track filled with yarn red.",
  props: { value: { type: "string", default: "0%", description: "Width of the fill, e.g. 42%." }, tall: { type: "boolean", default: false } },
  root: {
    id: "root",
    type: "box",
    height: m("tall", { true: 20, false: 12 }),
    border: "$border.default",
    background: "$color.surface",
    overflow: "hidden",
    children: [{ id: "fill", type: "box", height: "full", width: { prop: "value" }, background: "$color.accent" }],
  },
};
const Stat = {
  description: "A number with a label under it. Counters in the tracker and editor.",
  props: { value: { type: "string" }, label: { type: "string" }, big: { type: "boolean", default: false } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    gap: "$space.1",
    children: [
      { id: "v", type: "text", value: { prop: "value" }, font: m("big", { true: "$font.counter", false: "$font.h2" }) },
      { id: "l", type: "text", value: { prop: "label" }, font: "$font.label", textTransform: "uppercase", color: "$color.textMuted" },
    ],
  },
};
write("components/feedback.nyui.json", {
  schema: 3,
  name: "Feedback",
  meta: {
    group: "Feedback",
    order: 1,
    status: "draft",
    description: "Badges, progress and counters.",
    usage: { do: ["Use yellow (highlight) for in-progress, moss for finished."], dont: ["Use red for anything that is not the primary action, the active row or an error."] },
  },
  components: { Badge, ProgressBar, Stat },
  artboards: [
    {
      id: "feedback-specimens",
      name: "Feedback — badges, progress, stats",
      size: { width: 760, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.6",
        padding: "$space.8",
        children: [
          {
            id: "badges",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.3",
            children: [
              { id: "b1", use: "Badge", props: { label: "Not started" } },
              { id: "b2", use: "Badge", props: { label: "In progress", variant: "highlight" } },
              { id: "b3", use: "Badge", props: { label: "Finished", variant: "success" } },
              { id: "b4", use: "Badge", props: { label: "Row 6 ←", variant: "accent" } },
              { id: "b5", use: "Badge", props: { label: ".knitpx", variant: "inverse" } },
            ],
          },
          { id: "p1", use: "ProgressBar", props: { value: "38%" } },
          { id: "p2", use: "ProgressBar", props: { value: "72%", tall: true } },
          {
            id: "stats",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: "$space.10",
            children: [
              { id: "s1", use: "Stat", props: { value: "6/13", label: "Row", big: true } },
              { id: "s2", use: "Stat", props: { value: "7/15", label: "Stitch", big: true } },
              { id: "s3", use: "Stat", props: { value: "41%", label: "Done" } },
            ],
          },
        ],
      },
    },
  ],
});

// ================= components/input =================
const TextField = {
  description: "A labelled single-line input.",
  props: { label: { type: "string" }, value: { type: "string" }, focused: { type: "boolean", default: false } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    gap: "$space.1",
    children: [
      { id: "label", type: "text", value: { prop: "label" }, font: "$font.label", textTransform: "uppercase" },
      {
        id: "field",
        type: "box",
        padding: ["$space.2", "$space.3"],
        background: "$color.surface",
        border: m("focused", { true: "$border.focus", false: "$border.default" }),
        shadow: m("focused", { true: "$shadow.sm", false: "$shadow.none" }),
        children: [{ id: "value", type: "text", value: { prop: "value" }, font: "$font.body" }],
      },
    ],
  },
};
const NumberStepper = {
  description: "A labelled number with minus and plus. Canvas width and height.",
  props: { label: { type: "string" }, value: { type: "string" } },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    gap: "$space.1",
    children: [
      { id: "label", type: "text", value: { prop: "label" }, font: "$font.label", textTransform: "uppercase" },
      {
        id: "ctl",
        type: "box",
        layout: "stack",
        direction: "row",
        align: "center",
        border: "$border.default",
        background: "$color.surface",
        children: [
          { id: "minus", type: "box", layout: "stack", align: "center", justify: "center", width: 34, height: 34, children: [{ id: "mi", type: "icon", name: "minus", size: 16 }] },
          { id: "d1", type: "box", width: 2, height: 34, background: "$color.border" },
          { id: "value", type: "text", value: { prop: "value" }, font: "$font.mono", textAlign: "center", grow: 1 },
          { id: "d2", type: "box", width: 2, height: 34, background: "$color.border" },
          { id: "plus", type: "box", layout: "stack", align: "center", justify: "center", width: 34, height: 34, children: [{ id: "pi", type: "icon", name: "plus", size: 16 }] },
        ],
      },
    ],
  },
};
write("components/input.nyui.json", {
  schema: 3,
  name: "Input",
  meta: {
    group: "Inputs",
    order: 1,
    status: "draft",
    description: "Fields are boxes with a 2px frame; focus turns the frame red and lifts it.",
    usage: { do: ["Label every field, in uppercase label type."], dont: ["Use placeholder text as the label."] },
  },
  components: { TextField, NumberStepper },
  artboards: [
    {
      id: "input-specimens",
      name: "Input — fields and steppers",
      size: { width: 760, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        layout: "grid",
        columns: 3,
        gap: "$space.6",
        padding: "$space.8",
        children: [
          { id: "f1", use: "TextField", props: { label: "Pattern name", value: "Ace of spades" } },
          { id: "f2", use: "TextField", props: { label: "Pattern name", value: "Ace of spades", focused: true } },
          { id: "n1", use: "NumberStepper", props: { label: "Width", value: "18" } },
        ],
      },
    },
  ],
});

// ================= patterns/app-shell =================
const AppHeader = {
  description: "Top bar of every screen: logo, where you are, and the screen's actions.",
  props: {
    crumb: { type: "string", default: "" },
    compact: { type: "boolean", default: false, description: "Phones: 56px tall, logo mark only, icon-only actions." },
    actions: { type: "slot" },
  },
  root: {
    id: "root",
    type: "box",
    layout: "stack",
    direction: "column",
    background: "$color.surface",
    children: [
      {
        id: "bar",
        type: "box",
        layout: "stack",
        direction: "row",
        align: "center",
        justify: "between",
        height: m("compact", { true: 56, false: 68 }),
        padding: [0, m("compact", { true: "$space.3", false: "$space.6" })],
        children: [
          {
            id: "left",
            type: "box",
            layout: "stack",
            direction: "row",
            align: "center",
            gap: m("compact", { true: "$space.2", false: "$space.4" }),
            children: [
              { id: "logo", use: "Logo", props: { size: m("compact", { true: "mark", false: "sm" }) } },
              { id: "slash", type: "text", value: "/", font: "$font.h3", color: "$color.textMuted" },
              { id: "crumb", type: "text", value: { prop: "crumb" }, font: "$font.bodyStrong" },
            ],
          },
          {
            id: "actions",
            type: "box",
            layout: "stack",
            direction: "row",
            gap: m("compact", { true: "$space.2", false: "$space.3" }),
            align: "center",
            children: [{ slot: "actions" }, { id: "theme", use: "IconButton", props: { icon: "moon", bordered: false } }],
          },
        ],
      },
      { id: "rule", type: "box", height: 2, background: "$color.border" },
    ],
  },
};
write("patterns/app-shell.nyui.json", {
  schema: 3,
  name: "App shell",
  meta: { group: "Patterns", order: 1, status: "draft", description: "The header every screen shares." },
  components: { AppHeader },
  artboards: [
    {
      id: "app-shell",
      name: "App header",
      size: { width: 1280, height: "auto" },
      background: "$color.bg",
      root: {
        id: "root",
        type: "box",
        children: [
          {
            id: "hdr",
            use: "AppHeader",
            props: { crumb: "Library" },
            slots: {
              actions: [
                { id: "imp", use: "Button", props: { label: "Import .knitpx", variant: "outline", hasIcon: true, icon: "upload" } },
                { id: "new", use: "Button", props: { label: "New pattern", hasIcon: true, icon: "plus" } },
              ],
            },
          },
        ],
      },
    },
  ],
});

// ================= screens =================
const screen = (id, name, header, body) => ({
  id,
  name,
  size: { width: 1280, height: 820 },
  background: "$color.bg",
  root: { id: "root", type: "box", layout: "stack", direction: "column", children: [header, body] },
});

write("screens/library.nyui.json", {
  schema: 3,
  name: "Library",
  meta: { group: "Screens", order: 1, status: "draft" },
  artboards: [
    screen(
      "library",
      "Library",
      {
        id: "hdr",
        use: "AppHeader",
        props: { crumb: "Library" },
        slots: {
          actions: [
            { id: "imp", use: "Button", props: { label: "Import .knitpx", variant: "outline", hasIcon: true, icon: "upload" } },
            { id: "new", use: "Button", props: { label: "New pattern", hasIcon: true, icon: "plus" } },
          ],
        },
      },
      {
        id: "main",
        type: "box",
        layout: "stack",
        direction: "column",
        gap: "$space.6",
        padding: ["$space.8", "$space.8"],
        children: [
          {
            id: "title-row",
            type: "box",
            layout: "stack",
            direction: "row",
            justify: "between",
            align: "end",
            children: [
              {
                id: "titles",
                type: "box",
                layout: "stack",
                direction: "column",
                gap: "$space.1",
                children: [
                  { id: "t", type: "text", value: "Your patterns", font: "$font.h1" },
                  { id: "st", type: "text", value: "4 patterns · 1 in progress", font: "$font.small", color: "$color.textMuted" },
                ],
              },
            ],
          },
          {
            id: "grid",
            type: "box",
            layout: "grid",
            columns: 4,
            gap: "$space.6",
            children: [
              { id: "c1", use: "PatternCard", props: { name: "Ace of spades", size: "18 × 26", status: "progress", percent: "38%" }, slots: { thumb: [pixelGrid("l1", B.ace, 6, { lines: false })] } },
              { id: "c2", use: "PatternCard", props: { name: "Heart", size: "15 × 13", status: "done", percent: "100%" }, slots: { thumb: [pixelGrid("l2", B.heart, 9, { lines: false })] } },
              { id: "c3", use: "PatternCard", props: { name: "Sitting cat", size: "14 × 14", status: "new" }, slots: { thumb: [pixelGrid("l3", B.cat, 9, { lines: false })] } },
              { id: "c4", use: "PatternCard", props: { name: "Checker border", size: "20 × 8", status: "new" }, slots: { thumb: [pixelGrid("l4", B.checker, 10, { lines: false })] } },
            ],
          },
        ],
      },
    ),
  ],
});

const editorTools = ["pencil", "eraser", "paint-bucket", "hand", "flip-horizontal-2"];
write("screens/editor.nyui.json", {
  schema: 3,
  name: "Editor",
  meta: { group: "Screens", order: 2, status: "draft" },
  artboards: [
    screen(
      "editor",
      "Editor",
      {
        id: "hdr",
        use: "AppHeader",
        props: { crumb: "Ace of spades" },
        slots: {
          actions: [
            { id: "exp", use: "Button", props: { label: "Export .knitpx", variant: "outline", hasIcon: true, icon: "download" } },
            { id: "trk", use: "Button", props: { label: "Start crocheting", hasIcon: true, icon: "play" } },
          ],
        },
      },
      {
        id: "body",
        type: "box",
        layout: "stack",
        direction: "row",
        grow: 1,
        children: [
          {
            id: "tools",
            type: "box",
            layout: "stack",
            direction: "column",
            gap: "$space.2",
            padding: "$space.4",
            background: "$color.sidebar",
            children: [
              ...editorTools.map((icon, i) => ({ id: `tool-${i}`, use: "IconButton", props: { icon, active: i === 0 } })),
              { id: "tool-sep", type: "box", height: 2, background: "$color.border", width: 40 },
              { id: "undo", use: "IconButton", props: { icon: "undo-2" } },
              { id: "redo", use: "IconButton", props: { icon: "redo-2" } },
            ],
          },
          { id: "vr1", type: "box", width: 2, background: "$color.border" },
          {
            id: "canvas",
            type: "box",
            layout: "stack",
            align: "center",
            justify: "center",
            grow: 1,
            background: "$color.surfaceSunken",
            children: [pixelGrid("ed", B.ace, 23), zoom("ed-zoom")],
          },
          { id: "vr2", type: "box", width: 2, background: "$color.border" },
          {
            id: "side",
            type: "box",
            layout: "stack",
            direction: "column",
            gap: "$space.5",
            padding: "$space.5",
            width: 300,
            background: "$color.sidebar",
            children: [
              { id: "name", use: "TextField", props: { label: "Pattern name", value: "Ace of spades" } },
              {
                id: "size",
                use: "Panel",
                props: { title: "Canvas size" },
                slots: {
                  body: [
                    {
                      id: "steps",
                      type: "box",
                      layout: "grid",
                      columns: 2,
                      gap: "$space.3",
                      children: [
                        { id: "w", use: "NumberStepper", props: { label: "Width", value: "18" } },
                        { id: "h", use: "NumberStepper", props: { label: "Height", value: "26" } },
                      ],
                    },
                  ],
                },
              },
              {
                id: "count",
                use: "Panel",
                props: { title: "Stitches" },
                slots: {
                  body: [
                    {
                      id: "legend",
                      type: "box",
                      layout: "stack",
                      direction: "column",
                      gap: "$space.2",
                      children: [
                        {
                          id: "lg-f",
                          type: "box",
                          layout: "stack",
                          direction: "row",
                          align: "center",
                          gap: "$space.2",
                          children: [
                            { id: "lg-f-c", use: "StitchCell", props: { state: "fill", size: 18 } },
                            { id: "lg-f-t", type: "text", value: "Fill — full square", font: "$font.small", grow: 1 },
                            { id: "lg-f-n", type: "text", value: "128", font: "$font.mono" },
                          ],
                        },
                        {
                          id: "lg-c",
                          type: "box",
                          layout: "stack",
                          direction: "row",
                          align: "center",
                          gap: "$space.2",
                          children: [
                            { id: "lg-c-c", use: "StitchCell", props: { state: "chain", size: 18 } },
                            { id: "lg-c-t", type: "text", value: "Chain — open square", font: "$font.small", grow: 1 },
                            { id: "lg-c-n", type: "text", value: "340", font: "$font.mono" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
              {
                id: "preview",
                use: "Panel",
                props: { title: "Preview" },
                slots: {
                  body: [{ id: "pv", type: "box", layout: "stack", align: "center", justify: "center", padding: "$space.2", background: "$color.surfaceSunken", children: [pixelGrid("pv", B.ace, 5, { lines: false })] }],
                },
              },
            ],
          },
        ],
      },
    ),
  ],
});

// Tracker: heart, 81 stitches done (rows 1-5 + 6 stitches of row 6, right to left)
write("screens/tracker.nyui.json", {
  schema: 3,
  name: "Tracker",
  meta: { group: "Screens", order: 3, status: "draft" },
  artboards: [
    screen(
      "tracker",
      "Tracker",
      {
        id: "hdr",
        use: "AppHeader",
        props: { crumb: "Heart" },
        slots: {
          actions: [
            { id: "edit", use: "Button", props: { label: "Edit pattern", variant: "ghost", hasIcon: true, icon: "pencil" } },
            { id: "load", use: "Button", props: { label: "Load progress", variant: "outline", hasIcon: true, icon: "folder-open" } },
            { id: "save", use: "Button", props: { label: "Save progress", variant: "outline", hasIcon: true, icon: "save" } },
          ],
        },
      },
      {
        id: "body",
        type: "box",
        layout: "stack",
        direction: "row",
        grow: 1,
        children: [
          {
            id: "canvas",
            type: "box",
            layout: "stack",
            align: "center",
            justify: "center",
            grow: 1,
            background: "$color.surfaceSunken",
            children: [pixelGrid("tr", B.heart, 34, { progress: 81, rowNumbers: true }), zoom("tr-zoom")],
          },
          { id: "vr", type: "box", width: 2, background: "$color.border" },
          {
            id: "side",
            type: "box",
            layout: "stack",
            direction: "column",
            gap: "$space.5",
            padding: "$space.6",
            width: 380,
            background: "$color.sidebar",
            children: [
              {
                id: "stats",
                type: "box",
                layout: "stack",
                direction: "row",
                gap: "$space.8",
                children: [
                  { id: "row", use: "Stat", props: { value: "6/13", label: "Row", big: true } },
                  { id: "st", use: "Stat", props: { value: "7/15", label: "Stitch", big: true } },
                  { id: "pct", use: "Stat", props: { value: "41%", label: "Done", big: true } },
                ],
              },
              {
                id: "dir",
                type: "box",
                layout: "stack",
                direction: "row",
                align: "center",
                gap: "$space.2",
                children: [
                  { id: "dir-b", use: "Badge", props: { label: "Right → left", variant: "accent" } },
                  { id: "dir-t", type: "text", value: "Even rows go back.", font: "$font.small", color: "$color.textMuted" },
                ],
              },
              {
                id: "instr",
                use: "Panel",
                props: { title: "This row" },
                slots: {
                  body: [
                    {
                      id: "runs",
                      type: "box",
                      layout: "stack",
                      direction: "row",
                      wrap: true,
                      gap: "$space.2",
                      children: [
                        { id: "r1", use: "StitchRun", props: { kind: "chain", count: "3", status: "done" } },
                        { id: "r2", use: "StitchRun", props: { kind: "fill", count: "9", status: "active" } },
                        { id: "r3", use: "StitchRun", props: { kind: "chain", count: "3" } },
                      ],
                    },
                    { id: "now", type: "text", font: "$font.body", value: ["Now: ", { text: "fill", weight: 700 }, " — 4th of 9"] },
                  ],
                },
              },
              {
                id: "overall",
                type: "box",
                layout: "stack",
                direction: "column",
                gap: "$space.2",
                children: [
                  {
                    id: "ov-top",
                    type: "box",
                    layout: "stack",
                    direction: "row",
                    justify: "between",
                    children: [
                      { id: "ov-l", type: "text", value: "Overall", font: "$font.label", textTransform: "uppercase" },
                      { id: "ov-v", type: "text", value: "81 / 195 · 41%", font: "$font.monoSmall" },
                    ],
                  },
                  { id: "ov-bar", use: "ProgressBar", props: { value: "41%", tall: true } },
                ],
              },
              { id: "spacer", type: "box", grow: 1 },
              {
                id: "nav",
                type: "box",
                layout: "stack",
                direction: "column",
                gap: "$space.3",
                children: [
                  { id: "next", use: "Button", props: { label: "Next stitch", size: "lg", hasIcon: true, icon: "arrow-right" } },
                  {
                    id: "nav2",
                    type: "box",
                    layout: "grid",
                    columns: 3,
                    gap: "$space.3",
                    children: [
                      { id: "prev", use: "Button", props: { label: "Back", variant: "outline", size: "sm", hasIcon: true, icon: "undo-2" } },
                      { id: "rundone", use: "Button", props: { label: "Run", variant: "outline", size: "sm", hasIcon: true, icon: "chevrons-right" } },
                      { id: "rowdone", use: "Button", props: { label: "Row", variant: "secondary", size: "sm", hasIcon: true, icon: "chevrons-up" } },
                    ],
                  },
                  { id: "keys", type: "text", value: "Space next · ⌫ back · R finish run · ↵ finish row", font: "$font.monoSmall", color: "$color.textMuted", textAlign: "center" },
                  { id: "reset", use: "Button", props: { label: "Start over", variant: "ghost", size: "sm", hasIcon: true, icon: "rotate-ccw" } },
                ],
              },
            ],
          },
        ],
      },
    ),
  ],
});
// ================= phone artboards =================
import { readFileSync } from "node:fs";
const addArtboards = (rel, boards) => {
  const doc = JSON.parse(readFileSync(`${ROOT}/${rel}`, "utf8"));
  doc.artboards.push(...boards);
  write(rel, doc);
};
const phone = (id, name, header, body) => ({
  id,
  name,
  size: { width: 402, height: 874 },
  background: "$color.bg",
  root: { id: "root", type: "box", layout: "stack", direction: "column", children: [header, body] },
});
const iconBtn = (id, label, icon, variant = "outline") => ({ id, use: "Button", props: { label, icon, variant, hasIcon: true, iconOnly: true } });
const rule = (id, vertical = false) => (vertical ? { id, type: "box", width: 2, background: "$color.border" } : { id, type: "box", height: 2, background: "$color.border" });

addArtboards("screens/library.nyui.json", [
  phone(
    "library-mobile",
    "Library — phone",
    {
      id: "m-hdr",
      use: "AppHeader",
      props: { crumb: "Library", compact: true },
      slots: {
        actions: [iconBtn("m-imp", "Import .knitpx", "upload"), { id: "m-new", use: "Button", props: { label: "New pattern", hasIcon: true, icon: "plus" } }],
      },
    },
    {
      id: "m-main",
      type: "box",
      layout: "stack",
      direction: "column",
      gap: "$space.5",
      padding: "$space.4",
      children: [
        {
          id: "m-titles",
          type: "box",
          layout: "stack",
          direction: "column",
          gap: "$space.1",
          children: [
            { id: "m-t", type: "text", value: "Your patterns", font: "$font.h1" },
            { id: "m-st", type: "text", value: "4 patterns · 1 in progress", font: "$font.small", color: "$color.textMuted" },
          ],
        },
        { id: "m-c1", use: "PatternCard", props: { name: "Ace of spades", size: "18 × 26", status: "progress", percent: "38%" }, slots: { thumb: [pixelGrid("ml1", B.ace, 6, { lines: false })] } },
        { id: "m-c2", use: "PatternCard", props: { name: "Heart", size: "15 × 13", status: "done", percent: "100%" }, slots: { thumb: [pixelGrid("ml2", B.heart, 9, { lines: false })] } },
      ],
    },
  ),
]);

addArtboards("screens/tracker.nyui.json", [
  phone(
    "tracker-mobile",
    "Tracker — phone",
    {
      id: "m-hdr",
      use: "AppHeader",
      props: { crumb: "Heart", compact: true },
      slots: { actions: [iconBtn("m-edit", "Edit pattern", "pencil", "ghost"), iconBtn("m-load", "Load progress", "folder-open"), iconBtn("m-save", "Save progress", "save")] },
    },
    {
      id: "m-body",
      type: "box",
      layout: "stack",
      direction: "column",
      grow: 1,
      children: [
        {
          id: "m-canvas",
          type: "box",
          layout: "stack",
          align: "center",
          justify: "center",
          grow: 1,
          background: "$color.surfaceSunken",
          children: [pixelGrid("mtr", B.heart, 19, { progress: 81, rowNumbers: true }), zoom("m-zoom")],
        },
        rule("m-rule"),
        {
          id: "m-panel",
          type: "box",
          layout: "stack",
          direction: "column",
          gap: "$space.3",
          padding: "$space.4",
          background: "$color.sidebar",
          children: [
            {
              id: "m-stats",
              type: "box",
              layout: "stack",
              direction: "row",
              gap: "$space.6",
              align: "end",
              children: [
                { id: "m-row", use: "Stat", props: { value: "6/13", label: "Row" } },
                { id: "m-st", use: "Stat", props: { value: "7/15", label: "Stitch" } },
                { id: "m-sp", type: "box", grow: 1 },
                { id: "m-pct", use: "Stat", props: { value: "41%", label: "Done" } },
              ],
            },
            { id: "m-bar", use: "ProgressBar", props: { value: "41%", tall: true } },
            {
              id: "m-instr",
              use: "Panel",
              props: { title: "Row 6" },
              slots: {
                body: [
                  { id: "m-dir", use: "Badge", props: { label: "Right → left", variant: "accent" }, alignSelf: "start" },
                  {
                    id: "m-runs",
                    type: "box",
                    layout: "stack",
                    direction: "row",
                    gap: "$space.2",
                    children: [
                      { id: "m-r1", use: "StitchRun", props: { kind: "chain", count: "3", status: "done" } },
                      { id: "m-r2", use: "StitchRun", props: { kind: "fill", count: "9", status: "active" } },
                      { id: "m-r3", use: "StitchRun", props: { kind: "chain", count: "3" } },
                    ],
                  },
                  { id: "m-now", type: "text", font: "$font.body", value: ["Now: ", { text: "fill", weight: 700 }, " — 4th of 9"] },
                ],
              },
            },
            { id: "m-next", use: "Button", props: { label: "Next stitch", size: "lg", hasIcon: true, icon: "arrow-right" } },
            {
              id: "m-nav",
              type: "box",
              layout: "stack",
              direction: "row",
              gap: "$space.3",
              children: [
                { id: "m-back", use: "Button", props: { label: "Back", variant: "outline", size: "sm", hasIcon: true, icon: "undo-2" }, grow: 1 },
                { id: "m-run", use: "Button", props: { label: "Run", variant: "outline", size: "sm", hasIcon: true, icon: "chevrons-right" }, grow: 1 },
                { id: "m-rowdone", use: "Button", props: { label: "Row", variant: "secondary", size: "sm", hasIcon: true, icon: "chevrons-up" }, grow: 1 },
                { id: "m-reset", use: "IconButton", props: { icon: "rotate-ccw", size: "sm" } },
              ],
            },
          ],
        },
      ],
    },
  ),
]);

addArtboards("screens/editor.nyui.json", [
  phone(
    "editor-mobile",
    "Editor — phone",
    {
      id: "m-hdr",
      use: "AppHeader",
      props: { crumb: "Ace of spades", compact: true },
      slots: { actions: [iconBtn("m-exp", "Export .knitpx", "download"), iconBtn("m-go", "Start crocheting", "play", "primary")] },
    },
    {
      id: "m-body",
      type: "box",
      layout: "stack",
      direction: "column",
      grow: 1,
      children: [
        {
          id: "m-canvas",
          type: "box",
          layout: "stack",
          align: "center",
          justify: "center",
          grow: 1,
          background: "$color.surfaceSunken",
          children: [pixelGrid("med", B.ace, 18), zoom("m-zoom")],
        },
        rule("m-rule"),
        {
          id: "m-tools",
          type: "box",
          layout: "stack",
          direction: "row",
          align: "center",
          gap: "$space.2",
          padding: ["$space.2", "$space.3"],
          background: "$color.sidebar",
          children: [
            ...editorTools.map((icon, i) => ({ id: `m-tool-${i}`, use: "IconButton", props: { icon, active: i === 0 } })),
            { id: "m-tsep", type: "box", width: 2, height: 32, background: "$color.border" },
            { id: "m-undo", use: "IconButton", props: { icon: "undo-2" } },
            { id: "m-sp", type: "box", grow: 1 },
            { id: "m-more", use: "IconButton", props: { icon: "sliders-horizontal" } },
          ],
        },
      ],
    },
  ),
  {
    id: "editor-mobile-sheet",
    name: "Editor — phone, settings open",
    extends: "editor-mobile",
    insert: [
      { into: "root", node: { id: "m-scrim", type: "box", position: "absolute", inset: { top: 0, right: 0, bottom: 0, left: 0 }, background: "$color.black", opacity: 0.4 } },
      {
        into: "root",
        node: {
          id: "m-sheet",
          type: "box",
          position: "absolute",
          inset: { right: 0, bottom: 0, left: 0 },
          layout: "stack",
          direction: "column",
          gap: "$space.4",
          padding: ["$space.4", "$space.4", "$space.8", "$space.4"],
          background: "$color.sidebar",
          border: "$border.default",
          children: [
            {
              id: "m-sheet-head",
              type: "box",
              layout: "stack",
              direction: "row",
              justify: "between",
              align: "center",
              children: [
                { id: "m-sheet-t", type: "text", value: "Pattern", font: "$font.label", textTransform: "uppercase" },
                { id: "m-sheet-x", use: "IconButton", props: { icon: "x", size: "sm", bordered: false } },
              ],
            },
            { id: "m-name", use: "TextField", props: { label: "Pattern name", value: "Ace of spades" } },
            {
              id: "m-size",
              use: "Panel",
              props: { title: "Canvas size" },
              slots: {
                body: [
                  {
                    id: "m-steps",
                    type: "box",
                    layout: "grid",
                    columns: 2,
                    gap: "$space.3",
                    children: [
                      { id: "m-w", use: "NumberStepper", props: { label: "Width", value: "18" } },
                      { id: "m-h", use: "NumberStepper", props: { label: "Height", value: "26" } },
                    ],
                  },
                ],
              },
            },
            {
              id: "m-count",
              use: "Panel",
              props: { title: "Stitches" },
              slots: {
                body: [
                  {
                    id: "m-lg",
                    type: "box",
                    layout: "stack",
                    direction: "row",
                    gap: "$space.4",
                    children: [
                      { id: "m-lg-f", use: "StitchCell", props: { state: "fill", size: 18 } },
                      { id: "m-lg-fn", type: "text", value: "Fill 128", font: "$font.mono" },
                      { id: "m-lg-c", use: "StitchCell", props: { state: "chain", size: 18 } },
                      { id: "m-lg-cn", type: "text", value: "Chain 340", font: "$font.mono" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
]);
console.log("ok");
