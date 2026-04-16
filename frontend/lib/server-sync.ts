import type { AgeBand, MeResponse, ProfileSnapshot } from "./types";
import { applyServerGamification } from "./gamification";
import { replaceJournalFromServer } from "./journal";
import { replaceSnapshotsFromServer } from "./profile-history";

/** Merge GET /api/me into localStorage caches for profile, XP, and journal. */
export function applyMeToLocal(me: MeResponse) {
  const snaps: ProfileSnapshot[] = me.snapshots.map((s) => ({
    at: s.at,
    age_band: s.age_band as AgeBand,
    identity_name: s.identity_name,
    strengths: s.strengths,
    demo_mode: s.demo_mode,
  }));
  replaceSnapshotsFromServer(snaps);
  applyServerGamification(me.gamification);
  replaceJournalFromServer(
    me.journal.map((j) => ({
      id: j.id,
      at: j.at,
      promptId: j.prompt_id,
      text: j.text,
    }))
  );
}
