"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import {
  clearConsent,
  clearPostConsentRedirect,
  clearProfileResult,
  saveOnboarding,
} from "@/lib/session";
import type { AgeBand } from "@/lib/types";

const bands: { id: AgeBand; label: string; hint: string }[] = [
  { id: "11-13", label: "11–13", hint: "Bright, simple words" },
  { id: "14-16", label: "14–16", hint: "Balanced tone" },
  { id: "17-18", label: "17–18", hint: "A touch more grown-up" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [age, setAge] = useState<AgeBand | null>(null);
  const [nickname, setNickname] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function next() {
    setErr(null);
    if (!age) {
      setErr("Pick the age range that fits you best.");
      return;
    }
    clearConsent();
    clearProfileResult();
    clearPostConsentRedirect();
    saveOnboarding(age, nickname.trim() || null);
    router.push("/consent");
  }

  return (
    <Shell
      eyebrow="Onboarding"
      title="Let us set the mood—softly."
      subtitle="Age helps the AI keep language right for you. Nickname is optional; you can use a fun name or initials."
    >
      <div className="space-y-8">
        <div>
          <p className="mb-3 text-sm font-medium text-zinc-300">Age band</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {bands.map((b) => {
              const active = age === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setAge(b.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-bloom-400/60 bg-bloom-500/10 shadow-glow"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <p className="font-display text-lg text-white">{b.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{b.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="nick"
            className="mb-3 block text-sm font-medium text-zinc-300"
          >
            What should we call you?{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="nick"
            maxLength={40}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Aisha, K, Starfish…"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-bloom-400/50 focus:outline-none focus:ring-1 focus:ring-bloom-400/30"
          />
        </div>

        {err ? (
          <p className="text-sm text-bloom-300" role="alert">
            {err}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={next}>
            Continue to scenarios
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/")}>
            Back home
          </Button>
        </div>
      </div>
    </Shell>
  );
}
