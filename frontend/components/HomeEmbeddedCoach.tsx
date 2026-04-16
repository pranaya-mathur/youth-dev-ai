"use client";

import { CoachChatPanel } from "@/components/CoachChatPanel";

export function HomeEmbeddedCoach() {
  return (
    <section
      id="home-coach"
      className="relative z-10 mt-14 w-full scroll-mt-24 border-t border-white/10 pt-12"
      aria-label="Youth Dev assistant"
    >
      <div className="glass-panel relative overflow-hidden p-6 shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-gradient-to-br from-aqua-500/20 to-bloom-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aqua-400">Youth Dev assistant</p>
        <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">Ask anything about this app</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          No signup step here—this chat is for how Youth Dev works, where to tap, and what features mean.
          For a full strengths journey with consent, use <strong className="text-zinc-300">Begin the journey</strong>{" "}
          when you are ready.
        </p>
        <CoachChatPanel className="mt-5" />
      </div>
    </section>
  );
}
