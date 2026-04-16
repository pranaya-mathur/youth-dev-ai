export type AgeBand = "11-13" | "14-16" | "17-18";

/** Stored client-side after the consent step; mirrored in API requests. */
export type ConsentRecord = {
  acceptedPrivacy: boolean;
  acceptedTerms: boolean;
  acceptedAiProcessing: boolean;
  guardianAttested: boolean;
  acceptedAgeCapacity: boolean;
  policyVersionPrivacy: string;
  policyVersionTerms: string;
  recordedAt: string;
};

export type StoredAnswer = {
  questionId: string;
  mcqId: string | null;
  text: string | null;
};

export type ProfileResult = {
  strengths: string[];
  identity_name: string;
  narrative: string;
  micro_action: string;
  reflection_prompt: string;
  demo_mode: boolean;
};

/** One saved “chapter” of the living profile (browser-only until accounts ship). */
export type ProfileSnapshot = {
  at: string;
  age_band: AgeBand;
  identity_name: string;
  strengths: string[];
  demo_mode: boolean;
};

export type JournalEntry = {
  id: string;
  at: string;
  promptId: string;
  text: string;
};

export type GamificationState = {
  xp: number;
  badges: string[];
  lastStreakMark: string | null;
  streakDays: number;
};

export type CoachChatMessage = { role: "user" | "assistant"; content: string };

export type CoachApiResponse = {
  reply: string;
  demo_mode: boolean;
};

export type MeGamification = {
  xp: number;
  badges: string[];
  streak_days: number;
  last_streak_mark: string | null;
};

export type MeSnapshot = {
  at: string;
  age_band: AgeBand;
  identity_name: string;
  strengths: string[];
  demo_mode: boolean;
};

export type MeJournalEntry = {
  id: string;
  at: string;
  prompt_id: string;
  text: string;
};

export type MeResponse = {
  user_id: string;
  snapshots: MeSnapshot[];
  gamification: MeGamification;
  journal: MeJournalEntry[];
};

export type RecurringStrength = {
  name: string;
  count: number;
};

export type IdentityHistoryItem = {
  at: string;
  name: string;
};

export type XPProgressItem = {
  at: string;
  xp: number;
  type: string;
};

export type TrendsResponse = {
  user_id: string;
  top_strengths: RecurringStrength[];
  identity_history: IdentityHistoryItem[];
  xp_progression: XPProgressItem[];
};

export type MicroActionResponse = {
  ok: boolean;
  xp_gained: number;
  xp_total: number;
};
