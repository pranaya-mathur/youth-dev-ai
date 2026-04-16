import type { AgeBand, ConsentRecord, ProfileResult, StoredAnswer } from "./types";
import { POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS } from "./policy";
import { YOUTH_USER_STORAGE_KEY } from "./youth-user-id";

export const KEYS = {
  age: "yd_age_band",
  nick: "yd_nickname",
  answers: "yd_answers",
  result: "yd_profile_result",
  consent: "yd_consent_json",
  seenProfileHash: "yd_profile_seen_hash",
  postConsentRedirect: "yd_post_consent_redirect",
} as const;

/** Internal paths allowed after consent (avoid open redirects via storage). */
const POST_CONSENT_ALLOWED = new Set([
  "/coach",
  "/play",
  "/profile",
  "/check-in",
  "/assessment",
  "/results",
]);

export function setPostConsentRedirect(path: string) {
  if (typeof window === "undefined") return;
  if (!POST_CONSENT_ALLOWED.has(path)) return;
  sessionStorage.setItem(KEYS.postConsentRedirect, path);
}

export function clearPostConsentRedirect() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEYS.postConsentRedirect);
}

/** Returns the saved path once, then clears it. */
export function takePostConsentRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(KEYS.postConsentRedirect);
  sessionStorage.removeItem(KEYS.postConsentRedirect);
  if (!v || !POST_CONSENT_ALLOWED.has(v)) return null;
  return v;
}

export function saveOnboarding(age: AgeBand, nickname: string | null) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.age, age);
  sessionStorage.setItem(KEYS.nick, nickname ?? "");
}

export function loadOnboarding(): { age: AgeBand | null; nickname: string } {
  if (typeof window === "undefined") return { age: null, nickname: "" };
  const age = sessionStorage.getItem(KEYS.age) as AgeBand | null;
  const nickname = sessionStorage.getItem(KEYS.nick) ?? "";
  return { age: age && ["11-13", "14-16", "17-18"].includes(age) ? age : null, nickname };
}

export function saveAnswers(answers: StoredAnswer[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.answers, JSON.stringify(answers));
}

export function loadAnswers(): StoredAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEYS.answers);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAnswer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResult(r: ProfileResult) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.result, JSON.stringify(r));
}

export function loadResult(): ProfileResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEYS.result);
    if (!raw) return null;
    return JSON.parse(raw) as ProfileResult;
  } catch {
    return null;
  }
}

const LOCAL_EXTENDED = ["yd_profile_snapshots", "yd_gamification", "yd_journal"] as const;

export function clearSession() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
  LOCAL_EXTENDED.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem(YOUTH_USER_STORAGE_KEY);
}

export function saveConsent(record: ConsentRecord) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.consent, JSON.stringify(record));
}

export function loadConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEYS.consent);
    if (!raw) return null;
    const o = JSON.parse(raw) as ConsentRecord;
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEYS.consent);
}

function _consentFresh(recordedAt: string): boolean {
  const t = Date.parse(recordedAt);
  if (Number.isNaN(t)) return false;
  const maxMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - t <= maxMs;
}

/** True when consent matches current policy versions and age rules. */
export function hasValidConsent(age: AgeBand | null): boolean {
  if (!age) return false;
  const c = loadConsent();
  if (!c) return false;
  if (!_consentFresh(c.recordedAt)) return false;
  if (c.policyVersionPrivacy !== POLICY_VERSION_PRIVACY) return false;
  if (c.policyVersionTerms !== POLICY_VERSION_TERMS) return false;
  if (!c.acceptedPrivacy || !c.acceptedTerms || !c.acceptedAiProcessing) return false;
  if (age === "11-13" || age === "14-16") return c.guardianAttested === true;
  return c.acceptedAgeCapacity === true;
}

export function clearProfileResult() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEYS.result);
  sessionStorage.removeItem(KEYS.seenProfileHash);
}

export function clearAnswers() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEYS.answers);
}
