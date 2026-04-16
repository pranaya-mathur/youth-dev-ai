import type { JournalEntry } from "./types";

const STORAGE_KEY = "yd_journal";
const MAX = 60;

export const CHECKIN_PROMPTS: { id: string; text: string }[] = [
  { id: "w1", text: "What is one small moment this week when you showed up for someone?" },
  { id: "w2", text: "What felt a little scary—but you tried anyway?" },
  { id: "w3", text: "Who made you feel a bit more hopeful, and how?" },
  { id: "w4", text: "What is a strength you used without even noticing?" },
  { id: "w5", text: "What would you tell your past self from one month ago?" },
  { id: "w6", text: "What is one kind thing you could do for yourself in the next 24 hours?" },
  { id: "w7", text: "What is a value you want your choices to reflect more often?" },
];

/** Rotates prompts by ISO week so it feels “weekly” without accounts. */
export function currentPrompt(): { id: string; text: string } {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const idx = Math.abs(week) % CHECKIN_PROMPTS.length;
  return CHECKIN_PROMPTS[idx]!;
}

export function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveJournal(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function addJournalEntry(text: string, promptId: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const entry: JournalEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    promptId,
    text: trimmed.slice(0, 2000),
  };
  saveJournal([entry, ...loadJournal()]);
}

export function clearJournal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Replace device journal with server list after a successful sync. */
export function replaceJournalFromServer(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  saveJournal(entries.slice(0, MAX));
}
