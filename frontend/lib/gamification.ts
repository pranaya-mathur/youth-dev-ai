import type { GamificationState, MeGamification } from "./types";

const STORAGE_KEY = "yd_gamification";

const BADGE_FIRST_SPARK = "first_spark";
const BADGE_PATH_WALKER = "path_walker";
const BADGE_STEADY_GLOW = "steady_glow";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + "T12:00:00Z");
  const db = Date.parse(b + "T12:00:00Z");
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

function defaultState(): GamificationState {
  return { xp: 0, badges: [], lastStreakMark: null, streakDays: 0 };
}

export function loadGamification(): GamificationState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const o = JSON.parse(raw) as GamificationState;
    if (!o || typeof o !== "object") return defaultState();
    return {
      xp: typeof o.xp === "number" ? o.xp : 0,
      badges: Array.isArray(o.badges) ? o.badges : [],
      lastStreakMark: typeof o.lastStreakMark === "string" ? o.lastStreakMark : null,
      streakDays: typeof o.streakDays === "number" ? o.streakDays : 0,
    };
  } catch {
    return defaultState();
  }
}

function saveGamification(s: GamificationState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function addBadge(state: GamificationState, id: string) {
  if (!state.badges.includes(id)) state.badges.push(id);
}

export type GamificationDelta = {
  xpGained: number;
  newBadges: string[];
  level: number;
  streakDays: number;
};

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 120) + 1;
}

/** Call once per newly generated profile (not on cache reload). */
export function recordNewProfileMilestone(totalSnapshotsAfterAppend: number): GamificationDelta {
  const state = loadGamification();
  const xpGained = 55;
  state.xp += xpGained;

  const today = todayUTC();
  if (!state.lastStreakMark) {
    state.streakDays = 1;
    state.lastStreakMark = today;
  } else {
    const diff = daysBetween(state.lastStreakMark, today);
    if (diff === 0) {
      /* same calendar day */
    } else if (diff === 1) {
      state.streakDays += 1;
      state.lastStreakMark = today;
    } else {
      state.streakDays = 1;
      state.lastStreakMark = today;
    }
  }

  const newBadges: string[] = [];
  if (totalSnapshotsAfterAppend === 1) {
    addBadge(state, BADGE_FIRST_SPARK);
    newBadges.push(BADGE_FIRST_SPARK);
  }
  if (totalSnapshotsAfterAppend >= 3) {
    if (!state.badges.includes(BADGE_PATH_WALKER)) {
      addBadge(state, BADGE_PATH_WALKER);
      newBadges.push(BADGE_PATH_WALKER);
    }
  }
  if (state.streakDays >= 3) {
    if (!state.badges.includes(BADGE_STEADY_GLOW)) {
      addBadge(state, BADGE_STEADY_GLOW);
      newBadges.push(BADGE_STEADY_GLOW);
    }
  }

  saveGamification(state);
  return {
    xpGained,
    newBadges,
    level: levelFromXp(state.xp),
    streakDays: state.streakDays,
  };
}

export function badgeLabel(id: string): string {
  switch (id) {
    case BADGE_FIRST_SPARK:
      return "First Spark";
    case BADGE_PATH_WALKER:
      return "Path Walker";
    case BADGE_STEADY_GLOW:
      return "Steady Glow";
    default:
      return id;
  }
}

export function clearGamification() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Persist server gamification as the local cache (used when DATABASE_URL is set). */
export function applyServerGamification(g: MeGamification) {
  const state: GamificationState = {
    xp: g.xp,
    badges: [...g.badges],
    lastStreakMark: g.last_streak_mark,
    streakDays: g.streak_days,
  };
  saveGamification(state);
}

export function addXp(points: number) {
  const s = loadGamification();
  s.xp += points;
  saveGamification(s);
}
