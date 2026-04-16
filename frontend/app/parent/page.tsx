"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { fetchMeWithTimeout, fetchTrends, fetchMeExportBlob } from "@/lib/api";
import { levelFromXp, loadGamification } from "@/lib/gamification";
import { loadSnapshots } from "@/lib/profile-history";
import type { TrendsResponse } from "@/lib/types";

export default function ParentDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState(() => loadGamification());
  const [trends, setTrends] = useState<TrendsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchMeWithTimeout(8000);
      try {
        const trendData = await fetchTrends();
        if (!cancelled) setTrends(trendData);
      } catch (e) {
        console.error("Trends not available", e);
      }
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadExport() {
    try {
      const blob = await fetchMeExportBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youth-dev-guardian-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Make sure your device is online.");
    }
  }

  return (
    <Shell
      eyebrow="Guardian view"
      title="Supporting their journey."
      subtitle="This is a summary of growth and recurring strengths. Raw notes and AI chat history are kept private to the user to encourage honest reflection."
    >
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Current Progress</p>
          <p className="mt-4 font-display text-4xl text-white">Level {levelFromXp(game.xp)}</p>
          <p className="text-sm text-zinc-400 mt-1">{game.xp} XP total</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Total Snapshots</p>
          <p className="mt-4 font-display text-4xl text-white">{trends?.identity_history.length || 0}</p>
          <p className="text-sm text-zinc-400 mt-1">Growth milestones</p>
        </div>
      </div>

      <div className="mb-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Strength Analytics</p>
        <div className="glass-panel p-6">
          <div className="flex flex-wrap gap-3">
            {trends?.top_strengths.length ? (
              trends.top_strengths.map((s) => (
                <div key={s.name} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center min-w-[120px]">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">Spotted {s.count} times</p>
                </div>
              ))
            ) : (
              <p className="text-center w-full py-8 text-zinc-500">Patterns will emerge as they use the app more frequently.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Data & Transparency</p>
        <div className="glass-panel p-6">
          <p className="text-sm text-zinc-300 leading-relaxed">
            You can export a full data backup for school portfolios or personal records. 
            This file includes symbolic identities, strengths, and narrative summaries.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="soft" onClick={downloadExport}>
              Download Data Portfolio
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/profile")}>
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
