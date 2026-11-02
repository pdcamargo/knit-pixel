import { fileName, toKnitpx, type Pattern } from "./pattern";

/** Download as .knitpx. With progress, the file also carries how far along it is. */
export function downloadPattern(p: Pattern, { withProgress = false } = {}) {
  const blob = new Blob([toKnitpx(p, { withProgress })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(p, withProgress ? "-progress" : "");
  a.click();
  URL.revokeObjectURL(url);
}

export function pickFiles(accept: string): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = true;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.click();
  });
}
