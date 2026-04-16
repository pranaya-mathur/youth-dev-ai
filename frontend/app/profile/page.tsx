"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { badgeLabel, levelFromXp, loadGamification } from "@/lib/gamification";
import { fetchMeWithTimeout } from "@/lib/api";
import { loadSnapshots } from "@/lib/profile-history";
import { applyMeToLocal } from "@/lib/server-sync";
import { loadJournal } from "@/lib/journal";
import {
  hasValidConsent,
  loadOnboarding,
  loadResult,
  clearAnswers,
  clearProfileResult,
  setPostConsentRedirect,
} from "@/lib/session";

export default function ProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [snaps, setSnaps] = useState(() => loadSnapshots());
  const [game, setGame] = useState(() => loadGamification());
  const [journalCount, setJournalCount] = useState(0);

  useEffect(() => {
    const { age } = loadOnboarding();
    if (!age) {
      router.replace("/onboarding");
      return;
    }
    if (!hasValidConsent(age)) {
      setPostConsentRedirect("/profile");
      router.replace("/consent");
      return;
    }
    let cancelled = false;
    (async () => {
      const me = await fetchMeWithTimeout(8000);
      if (!cancelled && me) applyMeToLocal(me);
      if (!cancelled) {
        setSnaps(loadSnapshots());
        setGame(loadGamification());
        setJournalCount(loadJournal().length);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <Shell eyebrow="Living profile" title="Loading…" subtitle="">
        <p className="text-sm text-zinc-500">Opening your profile…</p>
      </Shell>
    );
  }

  const latestRun = loadResult();

  return (
    <Shell
      eyebrow="Living profile"
      title="Your story keeps growing."
      subtitle="When cloud sync is on for your pilot, your timeline and XP can stay updated across visits. Otherwise everything stays on this device. You can clear data anytime from Data & rights."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Level (XP)
          </p>
          <p className="mt-2 font-display text-2xl text-white">
            {levelFromXp(game.xp)}{" "}
            <span className="text-sm font-normal text-zinc-500">· {game.xp} XP</span>
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Streak
          </p>
          <p className="mt-2 font-display text-2xl text-white">{game.streakDays} days</p>
          <p className="mt-1 text-xs text-zinc-500">From profile milestones</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Journal
          </p>
          <p className="mt-2 font-display text-2xl text-white">{journalCount}</p>
          <p className="mt-1 text-xs text-zinc-500">Reflection entries</p>
        </div>
      </div>

      {game.badges.length ? (
        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-bloom-300">
            Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {game.badges.map((b) => (
              <span
                key={b}
                className="rounded-full border border-bloom-400/30 bg-bloom-500/10 px-3 py-1 text-xs font-semibold text-bloom-100"
              >
                {badgeLabel(b)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            clearAnswers();
            clearProfileResult();
            router.push("/assessment");
          }}
        >
          Re-run scenarios
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/check-in")}>
          Weekly check-in
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/parent")}>
          Parent verification (planned)
        </Button>
      </div>

      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Snapshot timeline
      </p>
      {snaps.length === 0 && latestRun ? (
        <div className="mb-6 rounded-2xl border border-bloom-400/20 bg-bloom-500/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-bloom-300">
            Latest run (not in timeline yet)
          </p>
          <p className="mt-2 font-display text-2xl text-gradient">{latestRun.identity_name}</p>
          <p className="mt-2 text-sm text-zinc-400">{latestRun.strengths.join(" · ")}</p>
          <p className="mt-3 text-xs text-zinc-500">
            Open results to refresh this view, or re-run scenarios—new snapshots appear after you save a profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => router.push("/results")}>
              Open results
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/assessment")}>
              Re-run scenarios
            </Button>
          </div>
        </div>
      ) : null}
      {snaps.length === 0 && !latestRun ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-zinc-300">
            No timeline snapshots yet—finish the journey once and your chapters stack here (we keep
            the last 15 on this device; cloud sync can hold more when your team turns it on).
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => router.push("/assessment")}>
              Start scenarios
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/play")}>
              Play hub
            </Button>
          </div>
        </div>
      ) : snaps.length > 0 ? (
        <ul className="space-y-4">
          {snaps.map((s) => (
            <li key={s.at + s.identity_name} className="glass-panel p-5">
              <p className="text-xs text-zinc-500">
                {new Date(s.at).toLocaleString()} · Ages {s.age_band}
              </p>
              <p className="mt-2 font-display text-xl text-gradient">{s.identity_name}</p>
              <p className="mt-2 text-sm text-zinc-400">{s.strengths.join(" · ")}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Shell>
  );
}
