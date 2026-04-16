"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import {
  POLICY_VERSION_PRIVACY,
  POLICY_VERSION_TERMS,
} from "@/lib/policy";
import { loadOnboarding, saveConsent, takePostConsentRedirect } from "@/lib/session";
import type { AgeBand, ConsentRecord } from "@/lib/types";

export default function ConsentPage() {
  const router = useRouter();
  const [age, setAge] = useState<AgeBand | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [ai, setAi] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [capacity, setCapacity] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const { age: a } = loadOnboarding();
    if (!a) {
      router.replace("/onboarding");
      return;
    }
    setAge(a);
  }, [router]);

  function submit() {
    setErr(null);
    if (!age) return;
    if (!privacy || !terms || !ai) {
      setErr("Please accept the Privacy Policy, Terms of Use, and AI processing notice.");
      return;
    }
    if (age === "11-13" || age === "14-16") {
      if (!guardian) {
        setErr("A parent or guardian must confirm they reviewed Youth Dev with you.");
        return;
      }
    } else if (!capacity) {
      setErr("Please confirm you understand how Youth Dev works and that you may use it yourself.");
      return;
    }

    const record: ConsentRecord = {
      acceptedPrivacy: true,
      acceptedTerms: true,
      acceptedAiProcessing: true,
      guardianAttested: age === "11-13" || age === "14-16" ? guardian : false,
      acceptedAgeCapacity: age === "17-18" ? capacity : false,
      policyVersionPrivacy: POLICY_VERSION_PRIVACY,
      policyVersionTerms: POLICY_VERSION_TERMS,
      recordedAt: new Date().toISOString(),
    };
    saveConsent(record);
    router.push(takePostConsentRedirect() ?? "/assessment");
  }

  if (!age) {
    return (
      <Shell eyebrow="Consent" title="Loading…" subtitle="">
        <p className="text-sm text-zinc-500">Checking your session…</p>
      </Shell>
    );
  }

  const needsGuardian = age === "11-13" || age === "14-16";

  return (
    <Shell
      eyebrow="Consent & safety"
      title="Before we begin—your choice, clearly."
      subtitle="Youth Dev uses AI to reflect your strengths. Please read and agree to the policies that protect you and your data."
    >
      <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <p className="text-sm text-zinc-400">
          Policies open in a new tab so you can read without losing this page. Replace
          placeholder emails in those documents before launch.
        </p>

        <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-200">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-bloom-500 focus:ring-bloom-400"
          />
          <span>
            I have read and agree to the{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-aqua-400 underline"
            >
              Privacy Policy
            </Link>{" "}
            (version {POLICY_VERSION_PRIVACY}).
          </span>
        </label>

        <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-200">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-bloom-500 focus:ring-bloom-400"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-aqua-400 underline"
            >
              Terms of Use
            </Link>{" "}
            (version {POLICY_VERSION_TERMS}).
          </span>
        </label>

        <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-200">
          <input
            type="checkbox"
            checked={ai}
            onChange={(e) => setAi(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-bloom-500 focus:ring-bloom-400"
          />
          <span>
            I understand optional notes and responses may be sent to an AI provider to
            generate feedback, and that I should{" "}
            <strong className="text-zinc-100">not</strong> enter sensitive personal
            information.
          </span>
        </label>

        {needsGuardian ? (
          <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-200">
            <input
              type="checkbox"
              checked={guardian}
              onChange={(e) => setGuardian(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-bloom-500 focus:ring-bloom-400"
            />
            <span>
              <strong className="text-zinc-100">Parent / guardian:</strong> I have
              reviewed Youth Dev with this young person and I agree they may continue
              here.
            </span>
          </label>
        ) : (
          <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-200">
            <input
              type="checkbox"
              checked={capacity}
              onChange={(e) => setCapacity(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-bloom-500 focus:ring-bloom-400"
            />
            <span>
              I am in the 17–18 band, I understand Youth Dev is strengths-first
              reflection (not therapy), and I agree to use it on my own behalf.
            </span>
          </label>
        )}

        <div className="rounded-2xl border border-sun-400/25 bg-sun-400/5 p-4 text-sm text-zinc-300">
          <strong className="text-sun-200">If you feel unsafe</strong> in real life, talk
          to a trusted adult you know offline, or contact local emergency services or a
          youth helpline in your region. Youth Dev is not a crisis service.
        </div>

        {err ? (
          <p className="text-sm text-bloom-300" role="alert">
            {err}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" onClick={submit}>
            Continue to scenarios
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/onboarding")}>
            Back
          </Button>
          <Link
            href="/data-rights"
            className="self-center text-sm text-zinc-500 underline decoration-white/20 underline-offset-4 hover:text-zinc-300"
          >
            Data &amp; rights
          </Link>
        </div>
      </div>
    </Shell>
  );
}
