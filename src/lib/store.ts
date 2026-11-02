// Patterns live in Firestore at users/{uid}/patterns/{id}. Components read them through usePatterns().
import { useSyncExternalStore } from "react";
import { collection, deleteDoc, doc, onSnapshot, writeBatch, type Unsubscribe } from "firebase/firestore";
import { currentUser, onUserChange } from "./auth";
import { db } from "./firebase";
import type { Pattern } from "./pattern";
import { samplePatterns } from "./samples";
import { toast } from "./toast";

/** Where patterns lived before accounts. Moved into the account on the next sign-in. */
const LEGACY_KEY = "knitpx.patterns.v1";

/** Cells as a "0101…" string: up to 40k stitches, so this keeps documents small. */
type PatternDoc = Omit<Pattern, "id" | "cells"> & { cells: string };

const toDoc = ({ id: _id, cells, ...rest }: Pattern): PatternDoc => ({ ...rest, cells: cells.join("") });
const fromDoc = (id: string, d: PatternDoc): Pattern => ({ ...d, id, cells: Array.from(d.cells, Number) });

const patternRef = (uid: string, id: string) => doc(db, "users", uid, "patterns", id);

let uid: string | undefined;
let patterns: Pattern[] = [];
/** False until the first snapshot we can trust, so an empty cache doesn't flash "No patterns yet". */
let ready = false;
/** Edited locally but not written yet. Snapshots must not overwrite these. */
const dirty = new Set<string>();
let unsubscribe: Unsubscribe | undefined;
let saveTimer: number | undefined;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

onUserChange(() => {
  const next = currentUser()?.uid;
  if (next === uid) return;
  unsubscribe?.();
  clearTimeout(saveTimer);
  uid = next;
  patterns = [];
  ready = false;
  dirty.clear();
  unsubscribe = uid ? listen(uid) : undefined;
  emit();
});

function listen(uid: string) {
  let adopted = false;
  return onSnapshot(
    collection(db, "users", uid, "patterns"),
    // Metadata changes too, so we hear when an empty cached result is confirmed by the server.
    { includeMetadataChanges: true },
    (snap) => {
      const remote = snap.docs.map((d) => fromDoc(d.id, d.data() as PatternDoc));
      const byId = new Map(patterns.map((p) => [p.id, p]));
      const merged = remote.map((r) => {
        const mine = byId.get(r.id);
        // Keep unsaved local edits, and reuse unchanged objects so screens don't re-render.
        return mine && (dirty.has(r.id) || mine.updatedAt === r.updatedAt) ? mine : r;
      });
      const remoteIds = new Set(remote.map((p) => p.id));
      patterns = [...patterns.filter((p) => dirty.has(p.id) && !remoteIds.has(p.id)), ...merged];
      ready ||= !snap.metadata.fromCache || remote.length > 0;
      emit();

      if (!adopted && !snap.metadata.fromCache) {
        adopted = true;
        adoptLocalPatterns(uid, remoteIds);
      }
    },
    () => {
      ready = true;
      emit();
      toast("Couldn't load your patterns.", "error");
    },
  );
}

/** Upload patterns saved on this device before accounts existed, then forget the local copy. */
function adoptLocalPatterns(uid: string, have: Set<string>) {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (raw === null) return;
  let local: Pattern[] = [];
  try {
    local = JSON.parse(raw) as Pattern[];
  } catch {
    // Unreadable: nothing to rescue.
  }
  const batch = writeBatch(db);
  for (const p of local) if (!have.has(p.id)) batch.set(patternRef(uid, p.id), toDoc(p));
  batch
    .commit()
    .then(() => localStorage.removeItem(LEGACY_KEY))
    .catch(() => toast("Couldn't move this device's patterns into your account.", "error"));
}

/** Starter patterns for a brand-new account, unless this device has old patterns to bring along. */
export function seedNewAccount(uid: string) {
  if (localStorage.getItem(LEGACY_KEY) !== null) return;
  const batch = writeBatch(db);
  for (const p of samplePatterns()) batch.set(patternRef(uid, p.id), toDoc(p));
  batch.commit().catch(() => {});
}

/** Write pending edits now. Also call before signing out, while the write is still allowed. */
export function flushPatterns() {
  clearTimeout(saveTimer);
  if (!uid || dirty.size === 0) return;
  const batch = writeBatch(db);
  for (const id of dirty) {
    const p = patterns.find((x) => x.id === id);
    if (p) batch.set(patternRef(uid, id), toDoc(p));
  }
  dirty.clear();
  batch.commit().catch(() => toast("Couldn't save your changes.", "error"));
}
window.addEventListener("beforeunload", flushPatterns);
// Mobile browsers often skip beforeunload; hiding the tab is the last reliable moment.
document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushPatterns());

export function savePattern(p: Pattern) {
  const next = { ...p, updatedAt: Date.now() };
  const i = patterns.findIndex((x) => x.id === p.id);
  patterns = i === -1 ? [next, ...patterns] : patterns.map((x) => (x.id === p.id ? next : x));
  dirty.add(p.id);
  emit();
  // Painting updates many times a second; write once it settles.
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushPatterns, 1000);
}

export function deletePattern(id: string) {
  if (!uid) return;
  patterns = patterns.filter((p) => p.id !== id);
  dirty.delete(id);
  emit();
  deleteDoc(patternRef(uid, id)).catch(() => toast("Couldn't delete that pattern.", "error"));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePatterns() {
  return useSyncExternalStore(subscribe, () => patterns);
}

export function usePatternsReady() {
  return useSyncExternalStore(subscribe, () => ready);
}

export function usePattern(id: string) {
  return usePatterns().find((p) => p.id === id);
}
