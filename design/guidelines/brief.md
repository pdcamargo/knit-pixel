# Knit Pixel — brief

A web app for drawing pixel-art crochet charts (filet style), sharing them as `.knitpx` files, and tracking progress stitch by stitch.

## Look

Neo-brutalist, taken straight from the theme the user supplied: paper white, ink black, 0 radius, 2px black frames, hard 3px offset shadows with no blur. Square everything, because a stitch is a square.

## Colour

- **Yarn red** (`accent`, #DB0000 light / #FF0000 dark) is the primary action, the active row marker and progress fill. Nothing else is red.
- **Highlight yellow** marks "where you are": the current stitch, the active run, in-progress badges.
- **Moss** means finished. Clay is reserved.
- Chart colours (`stitch*`) never follow dark mode. A chart is paper and ink.

## Chart vocabulary

- Black square = **fill** (full square). White square = **chain** (open square). The user's words, so the UI uses them.
- Rows are numbered from the bottom. Row 1 is worked left → right from the bottom-left corner, row 2 right → left, and so on (serpentine).
- Tracker: finished stitches go gray, the current stitch is yellow, the active row number is red.

## Type

Inter for everything, Inter Black for the wordmark and display. SF Mono for counts, sizes and keyboard hints.

## Logo

Red yarn ball with needles, beside the KNIT PIXEL wordmark with PIXEL in red.

## Finished stitches

Cross-hatched in the app, over a dark base for fill and white for chain, so you can still read what you made. Nyra's canvas can't draw a hatch, so the specimens and screens here show the flat tone underneath.

## Zoom and pan

Every chart has zoom out / fit / zoom in at the bottom right. Fit stays active until the user zooms or pans. Pinch or ⌘-scroll zooms at the cursor, plain scroll or two fingers pan. In the tracker a drag pans and a tap jumps to that stitch. In the editor a drag paints, and the hand tool or a held Space pans. When zoomed in, the tracker follows the current stitch.

## Files

`.knitpx` is JSON: `rows` top-first, `#` = fill, `.` = chain. A plain export is just the pattern, for sharing. **Save progress** adds `progress` (finished stitches in working order), and **Load progress** only accepts a file for the same chart. Re-importing a pattern you already have asks whether to replace it or keep both.

## Phones

Below 768px: 56px header with the yarn ball only and icon-only actions. The tracker stacks the chart over a compact panel (stats, run chips that scroll sideways, Next stitch, Back/Run/Row and a Start over icon). The editor puts the tools in a bottom bar, and name, size and preview move into a bottom sheet.
