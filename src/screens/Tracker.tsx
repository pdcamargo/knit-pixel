import { useCallback, useEffect } from "react";
import { ArrowRight, ChevronsRight, ChevronsUp, FolderOpen, Pencil, RotateCcw, Save, Undo2 } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { ChartCanvas } from "../components/ChartCanvas";
import { Badge, Button, IconButton, Panel, ProgressBar, Stat } from "../components/ui";
import { downloadPattern, pickFiles } from "../lib/files";
import { cellToStitch, FILE_EXTENSION, fromKnitpx, KnitpxError, rowRuns, sameChart, totalStitches, type Pattern } from "../lib/pattern";
import { navigate } from "../lib/router";
import { savePattern } from "../lib/store";
import { toast } from "../lib/toast";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function Tracker({ pattern }: { pattern: Pattern }) {
  const total = totalStitches(pattern);
  const progress = Math.min(pattern.progress, total);
  const finished = progress >= total;
  const percent = Math.floor((progress / total) * 100);
  const row = Math.min(Math.floor(progress / pattern.width), pattern.height - 1);
  const inRow = finished ? pattern.width : progress % pattern.width;
  const leftToRight = row % 2 === 0;
  const runs = rowRuns(pattern, row);
  const active = runs.find((r) => inRow >= r.start && inRow < r.start + r.count);

  const setProgress = useCallback(
    (n: number) => savePattern({ ...pattern, progress: Math.max(0, Math.min(total, n)) }),
    [pattern, total],
  );
  const next = () => setProgress(progress + 1);
  const back = () => setProgress(progress - 1);
  const finishRun = () => active && setProgress(row * pattern.width + active.start + active.count);
  const finishRow = () => setProgress((row + 1) * pattern.width);
  const startOver = () => confirm("Start this pattern over from the first stitch?") && setProgress(0);

  const loadProgress = async () => {
    const [file] = await pickFiles(`${FILE_EXTENSION},.json`);
    if (!file) return;
    try {
      const saved = fromKnitpx(await file.text());
      if (!sameChart(saved, pattern)) throw new KnitpxError("This file is for a different pattern.");
      if (!saved.progress) throw new KnitpxError("This file has no progress saved in it. Use Save progress to make one.");
      setProgress(saved.progress);
      toast(`Loaded progress: ${saved.progress} of ${total} stitches.`);
    } catch (e) {
      toast(e instanceof KnitpxError ? e.message : "That file couldn't be read.", "error");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      const actions: Record<string, () => void> = {
        " ": next,
        ArrowRight: next,
        Backspace: back,
        ArrowLeft: back,
        r: finishRun,
        Enter: finishRow,
      };
      const fn = actions[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader crumb={pattern.name}>
        <Button collapse variant="ghost" icon={Pencil} onClick={() => navigate({ name: "edit", id: pattern.id })}>
          Edit pattern
        </Button>
        <Button collapse variant="outline" icon={FolderOpen} onClick={loadProgress}>
          Load progress
        </Button>
        <Button collapse variant="outline" icon={Save} onClick={() => downloadPattern({ ...pattern, progress }, { withProgress: true })}>
          Save progress
        </Button>
      </AppHeader>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-[40dvh] min-w-0 flex-1 flex-col bg-muted">
          <ChartCanvas pattern={pattern} progress={progress} panOnDrag onCellTap={(x, y) => setProgress(cellToStitch(pattern.width, pattern.height, x, y))} />
          <p className="pb-2 text-center text-[12px] text-muted-foreground max-md:hidden">Click a stitch to jump there. Drag to pan, pinch or ⌘-scroll to zoom.</p>
        </div>

        <aside className="flex shrink-0 flex-col gap-3 overflow-y-auto border-t-2 bg-sidebar p-4 md:w-[380px] md:gap-5 md:border-t-0 md:border-l-2 md:p-6">
          <div className="flex items-end gap-6">
            <Stat big label="Row" value={`${row + 1}/${pattern.height}`} />
            <Stat big label="Stitch" value={`${Math.min(inRow + 1, pattern.width)}/${pattern.width}`} />
            <div className="ml-auto">
              <Stat big label="Done" value={`${percent}%`} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between max-md:hidden">
              <span className="label-caps">Overall</span>
              <span className="font-mono text-[11px]">
                {progress} / {total} stitches
              </span>
            </div>
            <ProgressBar tall value={progress / total} />
          </div>

          {finished ? (
            <Panel title="Finished" className="max-md:gap-2 max-md:p-3">
              <p className="text-[22px] font-extrabold tracking-tight">You did all {total} stitches.</p>
              <p className="text-[13px] text-muted-foreground">Time to weave in the ends.</p>
            </Panel>
          ) : (
            <Panel title={`Row ${row + 1}`} className="max-md:gap-2 max-md:p-3">
              <div className="flex items-center gap-2">
                <Badge variant="primary">{leftToRight ? "Left → right" : "Right → left"}</Badge>
                <span className="text-[13px] text-muted-foreground max-md:hidden">{leftToRight ? "Odd rows go left to right." : "Even rows come back."}</span>
              </div>
              <ol className="flex gap-2 max-md:-mx-1 max-md:overflow-x-auto max-md:px-1 max-md:pb-1 md:flex-wrap">
                {runs.map((r) => {
                  const status = inRow >= r.start + r.count ? "done" : r === active ? "active" : "todo";
                  return (
                    <li
                      key={r.start}
                      className={
                        "flex shrink-0 items-center gap-2 border-2 px-2 py-1 " +
                        (status === "done" ? "border-muted bg-muted opacity-50" : status === "active" ? "border-primary bg-highlight-subtle hard-xs" : "bg-card")
                      }
                    >
                      <span className={"size-3.5 border border-black " + (r.fill ? "bg-black" : "bg-white")} />
                      <span className="font-mono text-[13px]">{r.count}</span>
                      <span className="text-[13px] font-semibold">{r.fill ? "fill" : "chain"}</span>
                    </li>
                  );
                })}
              </ol>
              {active && (
                <p>
                  Now: <strong>{active.fill ? "fill" : "chain"}</strong> — {ordinal(inRow - active.start + 1)} of {active.count}
                </p>
              )}
            </Panel>
          )}

          <div className="flex-1 max-md:hidden" />

          <div className="flex flex-col gap-3">
            <Button size="lg" icon={ArrowRight} disabled={finished} onClick={next}>
              Next stitch
            </Button>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 md:grid-cols-3">
              <Button variant="outline" size="sm" icon={Undo2} disabled={progress === 0} onClick={back}>
                Back
              </Button>
              <Button variant="outline" size="sm" icon={ChevronsRight} disabled={finished} onClick={finishRun}>
                Run
              </Button>
              <Button variant="secondary" size="sm" icon={ChevronsUp} disabled={finished} onClick={finishRow}>
                Row
              </Button>
              <IconButton size="sm" className="md:hidden" icon={RotateCcw} label="Start over" disabled={progress === 0} onClick={startOver} />
            </div>
            <p className="text-center font-mono text-[11px] text-muted-foreground max-md:hidden">Space next · ⌫ back · R finish run · ↵ finish row</p>
            <Button variant="ghost" size="sm" icon={RotateCcw} disabled={progress === 0} onClick={startOver} className="max-md:hidden">
              Start over
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
