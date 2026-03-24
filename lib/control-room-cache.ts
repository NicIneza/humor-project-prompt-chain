import type { CachedCaption, CachedTestRun } from "@/lib/types";

const CAPTIONS_KEY = "humor-control-room-captions";
const TEST_RUNS_KEY = "humor-control-room-test-runs";

function parseStoredValue<T>(key: string) {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [] as T[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[]);
  } catch {
    return [] as T[];
  }
}

function writeStoredValue<T>(key: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache writes. The UI still works for the current session.
  }
}

export function getCachedCaptions(flavorId?: number) {
  const captions = parseStoredValue<CachedCaption>(CAPTIONS_KEY);

  if (typeof flavorId !== "number") {
    return captions;
  }

  return captions.filter((caption) => caption.flavorId === flavorId);
}

export function pushCachedCaptions(nextCaptions: CachedCaption[]) {
  const current = parseStoredValue<CachedCaption>(CAPTIONS_KEY);
  const merged = [...nextCaptions, ...current].slice(0, 200);
  writeStoredValue(CAPTIONS_KEY, merged);
  return merged;
}

export function getCachedTestRuns(flavorId?: number) {
  const testRuns = parseStoredValue<CachedTestRun>(TEST_RUNS_KEY);

  if (typeof flavorId !== "number") {
    return testRuns;
  }

  return testRuns.filter((testRun) => testRun.flavorId === flavorId);
}

export function pushCachedTestRun(nextRun: CachedTestRun) {
  const current = parseStoredValue<CachedTestRun>(TEST_RUNS_KEY);
  const merged = [nextRun, ...current.filter((testRun) => testRun.id !== nextRun.id)].slice(0, 50);
  writeStoredValue(TEST_RUNS_KEY, merged);
  return merged;
}
