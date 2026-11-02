// Patterns live in localStorage. Components read them through usePatterns().
import { useSyncExternalStore } from "react";
import type { Pattern } from "./pattern";
import { samplePatterns } from "./samples";

const KEY = "knitpx.patterns.v1";

function load(): Pattern[] {
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    // Persist the samples right away so their ids survive a reload.
    const samples = samplePatterns();
    localStorage.setItem(KEY, JSON.stringify(samples));
    return samples;
  }
  try {
    return JSON.parse(raw) as Pattern[];
  } catch {
    return [];
  }
}

let patterns: Pattern[] = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function emit() {
  listeners.forEach((l) => l());
  // Painting updates many times a second; write to disk once it settles.
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 250);
}

function flush() {
  clearTimeout(saveTimer);
  localStorage.setItem(KEY, JSON.stringify(patterns));
}
window.addEventListener("beforeunload", flush);

export function savePattern(p: Pattern) {
  const next = { ...p, updatedAt: Date.now() };
  const i = patterns.findIndex((x) => x.id === p.id);
  patterns = i === -1 ? [next, ...patterns] : patterns.map((x) => (x.id === p.id ? next : x));
  emit();
}

export function deletePattern(id: string) {
  patterns = patterns.filter((p) => p.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePatterns() {
  return useSyncExternalStore(subscribe, () => patterns);
}

export function usePattern(id: string) {
  return usePatterns().find((p) => p.id === id);
}
