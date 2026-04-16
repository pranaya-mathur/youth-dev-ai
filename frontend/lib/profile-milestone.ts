import type { ProfileResult } from "./types";
import { KEYS } from "./session";
import { appendSnapshotFromResult, loadSnapshots } from "./profile-history";
import { recordNewProfileMilestone } from "./gamification";

export function profileResultHash(res: ProfileResult): string {
  return `${res.identity_name}|${res.strengths.join(",")}`;
}

/** Commit snapshot + XP/badges once per unique generated profile. */
export function tryCommitNewProfile(res: ProfileResult): {
  committed: boolean;
  delta: ReturnType<typeof recordNewProfileMilestone> | null;
} {
  if (typeof window === "undefined") return { committed: false, delta: null };
  const h = profileResultHash(res);
  const prev = sessionStorage.getItem(KEYS.seenProfileHash);
  if (prev === h) return { committed: false, delta: null };
  sessionStorage.setItem(KEYS.seenProfileHash, h);
  appendSnapshotFromResult(res);
  const total = loadSnapshots().length;
  const delta = recordNewProfileMilestone(total);
  return { committed: true, delta };
}
