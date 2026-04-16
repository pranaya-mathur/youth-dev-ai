"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { QUESTIONS } from "@/lib/assessment-data";
import { scenarioForBand } from "@/lib/scenario";
import {
  clearProfileResult,
  hasValidConsent,
  loadAnswers,
  loadOnboarding,
  saveAnswers,
  setPostConsentRedirect,
} from "@/lib/session";
import type { AgeBand, StoredAnswer } from "@/lib/types";

export default function AssessmentPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [mcq, setMcq] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<StoredAnswer[]>([]);
  const [age, setAge] = useState<AgeBand | null>(null);

  const q = QUESTIONS[index];
  const total = QUESTIONS.length;
  const progress = useMemo(
    () => Math.round(((index + (mcq ? 0.45 : 0)) / total) * 100),
    [index, mcq, total]
  );

  useEffect(() => {
    const { age: a } = loadOnboarding();
    if (!a) {
      router.replace("/onboarding");
      return;
    }
    if (!hasValidConsent(a)) {
      setPostConsentRedirect("/assessment");
      router.replace("/consent");
      return;
    }
    setAge(a);
  }, [router]);

  useEffect(() => {
    setAnswers(loadAnswers());
  }, []);

  useEffect(() => {
    const existing = loadAnswers().find((a) => a.questionId === q.id);
    if (existing) {
      setMcq(existing.mcqId);
      setText(existing.text ?? "");
    } else {
      setMcq(null);
      setText("");
    }
  }, [index, q.id]);

  if (!q) return null;

  function persist(next: StoredAnswer[]) {
    setAnswers(next);
    saveAnswers(next);
  }

  function goNext() {
    if (!mcq) return;
    const others = answers.filter((a) => a.questionId !== q.id);
    const row: StoredAnswer = {
      questionId: q.id,
      mcqId: mcq,
      text: q.optionalText && text.trim() ? text.trim() : null,
    };
    const next = [...others, row];
    persist(next);
    if (index + 1 >= total) {
      clearProfileResult();
      router.push("/results");
      return;
    }
    setIndex((i) => i + 1);
  }

  function goBack() {
    if (index === 0) {
      router.push("/onboarding");
      return;
    }
    setIndex((i) => i - 1);
  }

  const bandClass =
    age === "11-13"
      ? "text-[1.06rem] leading-relaxed sm:text-[1.08rem]"
      : age === "17-18"
        ? "text-[0.97rem] leading-relaxed tracking-tight sm:text-[0.98rem]"
        : "";

  return (
    <Shell
      eyebrow={`Moment ${index + 1} of ${total}`}
      title="Story snapshots, not a test."
      subtitle={
        age === "11-13"
          ? "Tap what feels true for you. Optional notes are just for you—keep them simple and safe."
          : age === "17-18"
            ? "Tap what feels most true. Optional notes can add nuance—stay specific, skip sensitive personal data."
            : "Tap what feels most true. Optional notes are only for you—they help the AI be more specific."
      }
    >
      <div
        data-age-band={age ?? undefined}
        className={`space-y-6 ${bandClass}`}
      >
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bloom-500 via-sun-400 to-aqua-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="glass-panel space-y-6 p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Scenario
          </p>
          <p className="mt-2 text-lg leading-relaxed text-zinc-200">
            {scenarioForBand(q, age)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-bloom-200">{q.prompt}</p>
          <div className="mt-4 grid gap-3">
            {q.choices.map((c) => {
              const active = mcq === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMcq(c.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-aqua-400/50 bg-aqua-500/10 text-white"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {q.optionalText ? (
          <div>
            <label
              htmlFor="note"
              className="text-xs font-semibold uppercase tracking-widest text-zinc-500"
            >
              Optional note
            </label>
            <textarea
              id="note"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={400}
              placeholder="A detail, a feeling, a name—whatever you want to add."
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-bloom-400/40 focus:outline-none focus:ring-1 focus:ring-bloom-400/25"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" onClick={goNext} disabled={!mcq}>
          {index + 1 >= total ? "See my profile" : "Next moment"}
        </Button>
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>
      </div>
      </div>
    </Shell>
  );
}
