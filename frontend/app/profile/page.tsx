"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { badgeLabel, levelFromXp, loadGamification } from "@/lib/gamification";
import { fetchMeWithTimeout, fetchTrends, postMicroActionDone } from "@/lib/api";
import { loadSnapshots } from "@/lib/profile-history";
import { applyMeToLocal } from "@/lib/server-sync";
import { loadJournal } from "@/lib/journal";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { TrendsResponse } from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
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
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [markingAction, setMarkingAction] = useState(false);

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
      
      try {
        const trendData = await fetchTrends();
        if (!cancelled) setTrends(trendData);
      } catch (e) {
        console.error("Trends not available", e);
      }

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

  async function toggleMicroAction() {
    setMarkingAction(true);
    try {
      const res = await postMicroActionDone();
      setGame((prev) => ({ ...prev, xp: res.xp_total }));
      // Refresh trends to see new XP point
      const newTrends = await fetchTrends();
      setTrends(newTrends);
    } catch (e) {
      console.error("Failed to mark action", e);
    } finally {
      setMarkingAction(false);
    }
  }

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
            Guardian view
          </Button>
        </div>

        <Button type="button" variant="ghost" onClick={() => router.push("/parent")}>
          Guardian view
        </Button>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel space-y-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Growth Arc (XP)
          </p>
          {trends?.xp_progression.length ? (
            <div className="h-[200px]">
              <Line
                data={{
                  labels: trends.xp_progression.map((p) =>
                    new Date(p.at).toLocaleDateString()
                  ),
                  datasets: [
                    {
                      label: "XP",
                      data: trends.xp_progression.map((p) => p.xp),
                      borderColor: "rgba(52, 211, 235, 0.8)",
                      backgroundColor: "rgba(52, 211, 235, 0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { display: false },
                    y: {
                      grid: { color: "rgba(255,255,255,0.05)" },
                      ticks: { color: "rgba(255,255,255,0.3)", font: { size: 10 } },
                    },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-600">
              Complete more chapters to see your arc.
            </p>
          )}
        </div>

        <div className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Recurring Strengths
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {trends?.top_strengths.length ? (
              trends.top_strengths.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-[10px] text-zinc-500">{s.count} times</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Your patterns will appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Daily Micro-Action
        </p>
        <div className="rounded-2xl border border-sun-400/20 bg-sun-400/5 p-6">
          {latestRun ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md">
                <p className="text-sm text-zinc-200">{latestRun.micro_action}</p>
                <p className="mt-1 text-xs text-zinc-500">From your latest snapshot</p>
              </div>
              <Button
                type="button"
                variant="soft"
                disabled={markingAction}
                onClick={toggleMicroAction}
              >
                {markingAction ? "Saving…" : "I did it! (+15 XP)"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center">Run a scenario to get your first micro-action nudge.</p>
          )}
        </div>
      </div>

      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Journey Timeline
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
        <div className="relative space-y-8 before:absolute before:left-[19px] before:top-4 before:h-[calc(100%-32px)] before:w-[2px] before:bg-white/5">
          {snaps.map((s, idx) => (
            <div key={s.at + s.identity_name} className="relative pl-12">
              <div className="absolute left-0 top-1 h-[40px] w-[40px] rounded-full border-4 border-black bg-bloom-500 shadow-glow" />
              <div className="glass-panel p-5">
                <p className="text-xs text-zinc-500">
                  {new Date(s.at).toLocaleString()} · Ages {s.age_band}
                </p>
                <p className="mt-2 font-display text-xl text-gradient">{s.identity_name}</p>
                <p className="mt-2 text-sm text-zinc-400">{s.strengths.join(" · ")}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}
