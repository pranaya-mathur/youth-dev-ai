"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { CoachChatPanel } from "@/components/CoachChatPanel";
import { badgeLabel, levelFromXp, loadGamification } from "@/lib/gamification";
import { loadSnapshots } from "@/lib/profile-history";
import { loadJournal } from "@/lib/journal";
import { fetchMeWithTimeout } from "@/lib/api";
import { applyMeToLocal } from "@/lib/server-sync";
import {
  hasValidConsent,
  loadOnboarding,
  loadResult,
  setPostConsentRedirect,
} from "@/lib/session";

export default function PlayPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);

  useEffect(() => {
    const { age } = loadOnboarding();
    if (!age) {
      router.replace("/onboarding");
      return;
    }
    if (!hasValidConsent(age)) {
      setPostConsentRedirect("/play");
      router.replace("/consent");
      return;
    }
    setReady(true);

    let cancelled = false;
    (async () => {
      const me = await fetchMeWithTimeout(8000);
      if (cancelled) return;
      if (me) applyMeToLocal(me);
      const g = loadGamification();
      setXp(g.xp);
      setBadges(g.badges);
      setStreak(g.streakDays);
      setSnapCount(loadSnapshots().length);
      setJournalCount(loadJournal().length);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const scrollIfCoach = () => {
      if (window.location.hash !== "#coach") return;
      requestAnimationFrame(() => {
        document.getElementById("coach")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    scrollIfCoach();
    window.addEventListener("hashchange", scrollIfCoach);
    return () => window.removeEventListener("hashchange", scrollIfCoach);
  }, [ready]);

  if (!ready) {
    return (
      <Shell eyebrow="Play" title="Loading…" subtitle="">
        <p className="text-sm text-zinc-500">Loading your progress…</p>
      </Shell>
    );
  }

  const latest = loadResult();
  const noProgressYet =
    xp === 0 && snapCount === 0 && journalCount === 0 && streak === 0 && badges.length === 0;

  return (
    <Shell
      eyebrow="Play hub"
      title="Gamification lives here."
      subtitle="XP, badges, and streaks unlock as you finish profiles and journal check-ins. This is intentionally light—no grades, no punishment."
    >
      <section
        id="coach"
        className="mb-10 scroll-mt-28 border-b border-white/10 pb-10"
        aria-label="Youth Dev assistant"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aqua-400">Assistant</p>
        <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">Youth Dev help chat</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Same in-app assistant as Home and `/coach`—questions about Youth Dev, no extra setup.
        </p>
        <CoachChatPanel className="mt-5" />
      </section>

      {noProgressYet ? (
        <div className="mb-8 rounded-2xl border border-aqua-400/25 bg-aqua-500/10 p-6">
          <p className="font-display text-lg text-white">Start here</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Complete the story scenarios once to unlock your AI profile (+55 XP on a new result), save a
            check-in (+8 XP), then come back—this hub fills in as you go.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => router.push("/assessment")}>
              Go to scenarios
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/check-in")}>
              Weekly check-in
            </Button>
            {latest ? (
              <Button type="button" variant="ghost" onClick={() => router.push("/results")}>
                View latest results
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Progress
          </p>
          <p className="mt-2 font-display text-3xl text-white">
            Level {levelFromXp(xp)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{xp} total XP</p>
          <p className="mt-3 text-xs text-zinc-500">
            +55 XP each new AI profile · +8 XP per journal save
          </p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Streak & snapshots
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Streak: <strong className="text-white">{streak}</strong> day(s)
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Profile snapshots: <strong className="text-white">{snapCount}</strong>
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Journal entries: <strong className="text-white">{journalCount}</strong>
          </p>
        </div>
      </div>

      {badges.length ? (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-bloom-300">
            Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full border border-bloom-400/30 bg-bloom-500/10 px-3 py-1 text-xs font-semibold text-bloom-100"
              >
                {badgeLabel(b)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-8 text-sm text-zinc-500">
          No badges yet—finish one full profile run to earn your first spark.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            document.getElementById("coach")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Jump to help chat
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/coach")}>
          Full-page help
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/assessment")}>
          Scenarios
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/check-in")}>
          Check-in journal
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/profile")}>
          Living profile
        </Button>
      </div>

      <p className="mt-10 text-xs text-zinc-600">
        Tip: after XP shows up, a compact <strong className="text-zinc-400">Lv · XP</strong> chip
        appears in the top nav on wider screens.
      </p>
    </Shell>
  );
}
