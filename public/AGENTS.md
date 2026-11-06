# Knit Pixel: writing `.knitpx` pattern files

Knit Pixel (https://pdcamargo.github.io/knit-pixel/) is a chart editor for filet-style
crochet/knit patterns. Each cell of the chart is one stitch, and it is one of two kinds:

- **fill**: a full square
- **chain**: an open square

A pattern is a 1-bit picture: fill cells are the "ink" and chain cells are the background.
Users import patterns by dropping `.knitpx` files onto the Library screen.

This page tells you how to write one of those files.

## Format

A `.knitpx` file is UTF-8 JSON:

```json
{
  "format": "knitpx",
  "version": 1,
  "name": "Heart",
  "width": 7,
  "height": 6,
  "rows": [
    ".##.##.",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    "...#..."
  ]
}
```

| Field      | Required | Meaning |
|------------|----------|---------|
| `format`   | yes      | Always the string `"knitpx"`. |
| `version`  | yes      | Always the number `1`. |
| `rows`     | yes      | The chart, **top row first**. One string per row, one character per stitch: `#` = fill, `.` = chain. |
| `name`     | no       | Shown in the library. Empty or missing becomes `"Imported pattern"`. |
| `width`    | no       | Stitches per row. If present it must equal the length of every row. |
| `height`   | no       | Number of rows. If present it must equal `rows.length`. |
| `id`       | no       | Any string. Omit it for a new pattern. If it matches a pattern the user already has, the import asks whether to replace that pattern. |
| `progress` | no       | Finished stitch count, written only by progress saves. Omit it, so the pattern starts at 0. |

## Rules the importer enforces

The file is rejected, and the user sees an error, if any of these fail:

1. It parses as JSON and is an object.
2. `format` is `"knitpx"` and `version` is `1`.
3. `rows` is a non-empty array of strings.
4. Every row has the same length as the first row.
5. Width and height are each between **1 and 200**.
6. Rows contain only `#` and `.`. No spaces, `X`, `0`/`1` or other characters.
7. `width`/`height`, when present, match the rows.
8. `progress`, when present, is an integer from 0 to `width * height`.

## Tips for generating a good chart

- Draw the picture the right way up. `rows[0]` is the top of the image. The app works out
  the stitch order (bottom-left first, alternating direction each row) by itself.
- Leave a one-stitch border of `.` around the motif. It makes the edge of the finished piece
  cleaner.
- Keep the motif readable at the target size. Small charts (under about 20×20) only have
  room for bold shapes, so drop fine details instead of turning them into single stray stitches.
- Outline-only art (like small game sprites) works, but a solid silhouette usually reads
  better in fabric. Fill the interior with `#` if the outline alone looks busy.
- When converting an image, threshold it to 1 bit (dark = `#`, light = `.`) at the size you
  want in stitches. Don't scale it up, because one source pixel should be one stitch.
- Check that every row has the same length before you write the file.

## File name

Name the file after the pattern, lowercase, with hyphens: `"Ace of spades"` becomes
`ace-of-spades.knitpx`. Use the `.knitpx` extension. The import picker also accepts `.json`,
but `.knitpx` is what the app exports and what users recognise.

## Minimal validator (JavaScript)

```js
function validateKnitpx(f) {
  if (f.format !== "knitpx" || f.version !== 1) throw new Error("bad header");
  if (!Array.isArray(f.rows) || f.rows.length === 0) throw new Error("no rows");
  const w = f.rows[0].length, h = f.rows.length;
  if (w < 1 || w > 200 || h > 200) throw new Error("size out of range");
  if (f.width !== undefined && f.width !== w) throw new Error("width mismatch");
  if (f.height !== undefined && f.height !== h) throw new Error("height mismatch");
  f.rows.forEach((r, i) => {
    if (typeof r !== "string" || r.length !== w) throw new Error(`row ${i} wrong length`);
    if (!/^[#.]+$/.test(r)) throw new Error(`row ${i} has characters other than # and .`);
  });
}
```
