import type { AgeBand, ProfileResult, ProfileSnapshot } from "./types";
import { loadOnboarding } from "./session";

const STORAGE_KEY = "yd_profile_snapshots";
const MAX = 15;

export function loadSnapshots(): ProfileSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ProfileSnapshot[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveSnapshots(list: ProfileSnapshot[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
}

export function appendSnapshot(result: ProfileResult, age: AgeBand) {
  const snap: ProfileSnapshot = {
    at: new Date().toISOString(),
    age_band: age,
    identity_name: result.identity_name,
    strengths: result.strengths,
    demo_mode: result.demo_mode,
  };
  const next = [snap, ...loadSnapshots()].slice(0, MAX);
  saveSnapshots(next);
}

/** Append using onboarding age; no-op if age missing. */
export function appendSnapshotFromResult(result: ProfileResult) {
  const { age } = loadOnboarding();
  if (!age) return;
  appendSnapshot(result, age);
}

export function clearProfileSnapshots() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Overwrite local timeline with server-backed snapshots (Postgres sync). */
export function replaceSnapshotsFromServer(snapshots: ProfileSnapshot[]) {
  if (typeof window === "undefined") return;
  saveSnapshots(snapshots.slice(0, MAX));
}
