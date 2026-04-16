"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { RadarChart } from "@/components/RadarChart";
import html2canvas from "html2canvas";
import { fetchMe, fetchProfile } from "@/lib/api";
import { badgeLabel, levelFromXp, type GamificationDelta } from "@/lib/gamification";
import { opportunitiesFromStrengths } from "@/lib/opportunities";
import { QUESTIONS } from "@/lib/assessment-data";
import {
  KEYS,
  hasValidConsent,
  loadAnswers,
  loadOnboarding,
  loadResult,
  saveResult,
  setPostConsentRedirect,
} from "@/lib/session";
import { profileResultHash, tryCommitNewProfile } from "@/lib/profile-milestone";
import { applyMeToLocal } from "@/lib/server-sync";
import type { MeResponse, ProfileResult } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<GamificationDelta | null>(null);

  useEffect(() => {
    const { age, nickname } = loadOnboarding();
    const answers = loadAnswers();
    if (!age) {
      router.replace("/onboarding");
      return;
    }
    if (!hasValidConsent(age)) {
      setPostConsentRedirect("/results");
      router.replace("/consent");
      return;
    }
    if (answers.length < QUESTIONS.length) {
      router.replace("/assessment");
      return;
    }

    const cached = loadResult();
    if (cached?.strengths?.length) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        let meBefore: MeResponse | null = null;
        try {
          meBefore = await fetchMe();
        } catch {
          /* No DATABASE_URL or offline — local-only rewards below. */
        }

        const res = await fetchProfile({
          age_band: age,
          nickname: nickname.trim() || null,
          answers,
        });
        if (cancelled) return;
        saveResult(res);

        try {
          const meAfter = await fetchMe();
          if (cancelled) return;
          applyMeToLocal(meAfter);
          sessionStorage.setItem(KEYS.seenProfileHash, profileResultHash(res));
          const xp0 = meBefore?.gamification.xp ?? 0;
          const badge0 = new Set(meBefore?.gamification.badges ?? []);
          const xpGain = meAfter.gamification.xp - xp0;
          const newBadges = meAfter.gamification.badges.filter((b) => !badge0.has(b));
          if (xpGain > 0 || newBadges.length) {
            setReward({
              xpGained: Math.max(0, xpGain),
              newBadges,
              level: levelFromXp(meAfter.gamification.xp),
              streakDays: meAfter.gamification.streak_days,
            });
          }
        } catch {
          const { committed, delta } = tryCommitNewProfile(res);
          if (committed && delta) setReward(delta);
        }

        setData(res);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <Shell
        eyebrow="Almost there"
        title="We are weaving your story…"
        subtitle="This usually takes a few seconds. Stay on this screen—we are creating your strengths snapshot."
      >
        <div className="glass-panel flex flex-col items-center gap-6 p-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-bloom-400" />
          <p className="text-sm text-zinc-400">We are safely sending your answers to the AI engine…</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell
        eyebrow="Heads up"
        title="We could not reach the engine."
        subtitle="Check your internet connection, then try again. If you are in a pilot session, ask your facilitator to confirm the app is running."
      >
        <div className="glass-panel space-y-4 p-8">
          <p className="text-sm text-bloom-200">{error}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>
              Home
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  const opportunities = opportunitiesFromStrengths(data.strengths);

  async function shareCard() {
    const el = document.getElementById("profile-capture-card");
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#000",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `youth-dev-profile-${data.identity_name.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate card image", err);
    }
  }

  return (
    <Shell
      eyebrow="Your living snapshot"
      title="This is how your light reads—today."
      subtitle="These adjectives are your power indicators (gifts / superpowers)—not labels. Your identity name is symbolic and yours to grow into."
    >
      {data.demo_mode ? (
        <p className="mb-6 rounded-2xl border border-sun-400/30 bg-sun-400/10 px-4 py-3 text-sm text-sun-300">
          This snapshot uses <strong className="text-sun-100">sample text</strong> because live AI
          was not available for this session. Your facilitator can turn on the real engine for the
          next run.
        </p>
      ) : null}

      {reward ? (
        <div className="mb-6 rounded-3xl border border-aqua-400/30 bg-aqua-500/10 px-5 py-4 text-sm text-zinc-100">
          <p className="font-semibold text-aqua-200">Progress unlocked</p>
          <p className="mt-1 text-zinc-200">
            +{reward.xpGained} XP · Streak {reward.streakDays} day(s) · Level {reward.level}
          </p>
          {reward.newBadges.length ? (
            <p className="mt-2 text-xs text-zinc-300">
              New badges:{" "}
              {reward.newBadges.map((b) => (
                <span key={b} className="mr-2 inline-block rounded-full bg-white/10 px-2 py-0.5">
                  {badgeLabel(b)}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        <section
          id="profile-capture-card"
          className="glass-panel relative overflow-hidden p-8 shadow-card"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-bloom-500/25 blur-2xl" />
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-aqua-400">
                Symbolic identity
              </p>
              <h2 className="mt-3 font-display text-3xl text-gradient sm:text-4xl">
                {data.identity_name}
              </h2>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-bloom-300">
                Power indicators
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Positive qualities the AI noticed in you—signals of hope, connection, and
                growing confidence.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.strengths.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center rounded-2xl bg-white/[0.02] p-4">
              <RadarChart labels={data.strengths} />
            </div>
          </div>
        </section>

        <section className="glass-panel space-y-4 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Narrative
          </p>
          <div className="whitespace-pre-line text-base leading-relaxed text-zinc-200">
            {data.narrative}
          </div>
        </section>

        <section className="glass-panel space-y-4 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-sun-300">
            Opportunity nudges
          </p>
          <p className="text-sm text-zinc-500">
            Strength-linked ideas to explore—not prescriptions. Pick what feels realistic.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {opportunities.map((block) => (
              <div key={block.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="font-display text-lg text-white">{block.title}</p>
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-300">
                  {block.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-bloom-300">
              Micro-action
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              {data.micro_action}
            </p>
          </section>
          <section className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-aqua-400">
              Reflection
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              {data.reflection_prompt}
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button type="button" variant="soft" onClick={() => router.push("/profile")}>
            Open living profile
          </Button>
          <Button type="button" variant="ghost" onClick={shareCard}>
            Download Power Card
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/check-in")}>
            Weekly check-in
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/")}>
            Home
          </Button>
        </div>
      </div>
    </Shell>
  );
}
