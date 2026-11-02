import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Play, Plus, Trash2, Upload } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { Thumbnail } from "../components/Thumbnail";
import { Badge, Button, IconButton, ProgressBar } from "../components/ui";
import { downloadPattern, pickFiles } from "../lib/files";
import { createPattern, FILE_EXTENSION, fromKnitpx, KnitpxError, newId, totalStitches, type Pattern } from "../lib/pattern";
import { navigate } from "../lib/router";
import { deletePattern, savePattern, usePatterns } from "../lib/store";
import { toast } from "../lib/toast";

async function importFiles(files: File[], existing: Pattern[]) {
  let last: Pattern | undefined;
  for (const file of files) {
    try {
      last = fromKnitpx(await file.text());
      const mine = existing.find((p) => p.id === last!.id);
      // Re-importing one you already have (e.g. a progress save from another device): update it, or keep both.
      if (mine && !confirm(`You already have “${mine.name}”. Replace it with the one in ${file.name}?\n\nCancel keeps both.`)) {
        last = { ...last, id: newId(), name: `${last.name} (imported)` };
      }
      savePattern(last);
    } catch (e) {
      toast(`${file.name}: ${e instanceof KnitpxError ? e.message : "couldn't be read."}`, "error");
    }
  }
  if (last) toast(files.length === 1 ? `Imported “${last.name}”.` : `Imported ${files.length} patterns.`);
}

export function Library() {
  const patterns = usePatterns();
  const sorted = [...patterns].sort((a, b) => b.updatedAt - a.updatedAt);
  const inProgress = patterns.filter((p) => p.progress > 0 && p.progress < totalStitches(p)).length;
  const onFiles = useCallback((files: File[]) => importFiles(files, patterns), [patterns]);
  const dragging = useFileDrop(onFiles);

  const newPattern = () => {
    const p = createPattern("Untitled pattern", 20, 20);
    savePattern(p);
    navigate({ name: "edit", id: p.id });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader crumb="Library">
        <Button collapse variant="outline" icon={Upload} onClick={() => pickFiles(`${FILE_EXTENSION},.json`).then(onFiles)}>
          Import {FILE_EXTENSION}
        </Button>
        <Button icon={Plus} onClick={newPattern}>
          New pattern
        </Button>
      </AppHeader>

      <main className="flex flex-1 flex-col gap-5 p-4 md:gap-6 md:p-8">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.035em]">Your patterns</h1>
          <p className="text-[13px] text-muted-foreground">
            {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"}
            {inProgress > 0 && ` · ${inProgress} in progress`}
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="grid flex-1 place-items-center border-2 border-dashed p-12 text-center">
            <div className="flex max-w-sm flex-col items-center gap-4">
              <p className="text-[22px] font-extrabold tracking-tight">No patterns yet</p>
              <p className="text-muted-foreground">Draw one from scratch, or drop a {FILE_EXTENSION} file anywhere on this page.</p>
              <Button icon={Plus} onClick={newPattern}>
                New pattern
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-6">
            {sorted.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        )}
      </main>

      {dragging && (
        <div className="pointer-events-none fixed inset-4 z-40 grid place-items-center border-4 border-dashed border-primary bg-background/85">
          <p className="text-[22px] font-extrabold">Drop {FILE_EXTENSION} files to import</p>
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern: p }: { pattern: Pattern }) {
  const total = totalStitches(p);
  const status = p.progress === 0 ? "new" : p.progress >= total ? "done" : "progress";

  return (
    <article className="flex flex-col border-2 bg-card hard-md">
      <button
        className="grid h-[188px] place-items-center border-b-2 bg-muted p-4 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
        onClick={() => navigate({ name: "edit", id: p.id })}
        aria-label={`Edit ${p.name}`}
      >
        <Thumbnail pattern={p} maxWidth={220} maxHeight={150} />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-[17px] font-bold tracking-[-0.03em]">{p.name}</h2>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {p.width} × {p.height}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "new" && <Badge>Not started</Badge>}
          {status === "progress" && <Badge variant="highlight">In progress</Badge>}
          {status === "done" && <Badge variant="success">Finished</Badge>}
          {status === "progress" && <span className="font-mono text-[11px] text-muted-foreground">{Math.floor((p.progress / total) * 100)}%</span>}
        </div>
        <ProgressBar value={p.progress / total} />
        <div className="mt-1 flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={Play} onClick={() => navigate({ name: "track", id: p.id })}>
            {status === "progress" ? "Continue" : "Crochet"}
          </Button>
          <div className="flex-1" />
          <IconButton size="sm" bordered={false} icon={Download} label="Export .knitpx" onClick={() => downloadPattern(p)} />
          <IconButton
            size="sm"
            bordered={false}
            icon={Copy}
            label="Duplicate"
            onClick={() => savePattern({ ...p, id: newId(), name: `${p.name} copy`, progress: 0, createdAt: Date.now() })}
          />
          <IconButton
            size="sm"
            bordered={false}
            icon={Trash2}
            label="Delete"
            onClick={() => confirm(`Delete “${p.name}”? This can't be undone.`) && deletePattern(p.id)}
          />
        </div>
      </div>
    </article>
  );
}

/** Accept .knitpx files dropped anywhere on the window. Returns whether a drag is over it. */
function useFileDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      onFiles([...(e.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onFiles]);
  return dragging;
}
