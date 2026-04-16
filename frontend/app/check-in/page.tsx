"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { postJournal, fetchMe } from "@/lib/api";
import { addJournalEntry, currentPrompt, loadJournal } from "@/lib/journal";
import { addXp } from "@/lib/gamification";
import { applyMeToLocal } from "@/lib/server-sync";
import { hasValidConsent, loadOnboarding, setPostConsentRedirect } from "@/lib/session";
import type { JournalEntry } from "@/lib/types";

export default function CheckInPage() {
  const router = useRouter();
  const prompt = useMemo(() => currentPrompt(), []);
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { age } = loadOnboarding();
    if (!age) {
      router.replace("/onboarding");
      return;
    }
    if (!hasValidConsent(age)) {
      setPostConsentRedirect("/check-in");
      router.replace("/consent");
      return;
    }
    setEntries(loadJournal());
    setReady(true);
  }, [router]);

  async function save() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { age } = loadOnboarding();
    if (!age) return;
    try {
      await postJournal({ age_band: age, prompt_id: prompt.id, text: trimmed });
      const me = await fetchMe();
      applyMeToLocal(me);
    } catch {
      addJournalEntry(trimmed, prompt.id);
      addXp(8);
    }
    setText("");
    setEntries(loadJournal());
  }

  if (!ready) {
    return (
      <Shell eyebrow="Check-in" title="Loading…" subtitle="">
        <p className="text-sm text-zinc-500">Preparing your prompt…</p>
      </Shell>
    );
  }

  return (
    <Shell
      eyebrow="Check-in"
      title="A gentle pause—no grades."
      subtitle="One rotating weekly prompt. If your pilot has cloud sync on, entries can save online too; otherwise they stay only on this device."
    >
      <div className="glass-panel space-y-4 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-aqua-400">
          This week&apos;s prompt
        </p>
        <p className="text-lg leading-relaxed text-zinc-200">{prompt.text}</p>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write freely. Avoid passwords or sensitive personal details."
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-aqua-400/40 focus:outline-none focus:ring-1 focus:ring-aqua-400/25"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} disabled={!text.trim()}>
            Save entry (+8 XP)
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/profile")}>
            View living profile
          </Button>
        </div>
      </div>

      <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Recent entries
      </p>
      <ul className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <li className="text-sm text-zinc-500">No entries yet.</li>
        ) : (
          entries.slice(0, 8).map((e) => (
            <li key={e.id} className="glass-panel p-4 text-sm text-zinc-300">
              <p className="text-xs text-zinc-600">
                {new Date(e.at).toLocaleString()} · {e.promptId}
              </p>
              <p className="mt-2 whitespace-pre-line">{e.text}</p>
            </li>
          ))
        )}
      </ul>
    </Shell>
  );
}
