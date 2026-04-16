import Link from "next/link";
import { HomeEmbeddedCoach } from "@/components/HomeEmbeddedCoach";

const ctaPrimary =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bloom-500 to-bloom-400 px-6 py-3 text-sm font-semibold text-dusk-950 shadow-glow transition hover:brightness-110 active:scale-[0.98]";
const ctaGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-90" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-bloom-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-aqua-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-16 sm:px-10 sm:pt-24">
        <header className="flex items-center justify-between gap-4">
          <span className="font-display text-xl tracking-tight text-white">
            Youth<span className="text-gradient"> Dev</span>
          </span>
          <span className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-1.5 text-xs text-zinc-400 sm:inline">
            Ages 11–18 · power indicators, not labels
          </span>
        </header>

        <div className="mt-16 grid flex-1 gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10 min-w-0 space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-zinc-300">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-aqua-400" />
              Living profile, step one
            </p>
            <h1 className="font-display text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Feel seen.{" "}
              <span className="text-gradient">Name your light.</span> Move one
              tiny step.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
              A calm, non-test-like journey: a few story moments, one unified AI
              reflection, and a dashboard that celebrates who you are becoming—not
              what you are “labeled” as.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/onboarding" className={ctaPrimary}>
                Begin the journey
              </Link>
              <Link href="/onboarding" className={ctaGhost}>
                I am just exploring
              </Link>
            </div>
            <p className="text-xs text-zinc-600">
              By continuing you agree to our{" "}
              <Link className="text-aqua-400/90 hover:underline" href="/privacy">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link className="text-aqua-400/90 hover:underline" href="/terms">
                Terms of Use
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
              <div>
                <p className="font-semibold text-zinc-300">12 gentle scenarios</p>
                <p>No scores. No wrong answers.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">One AI pass</p>
                <p>Strengths, identity, story, micro-action.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/play"
                className="inline-flex rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Play hub · XP &amp; badges
              </Link>
              <Link
                href="#home-coach"
                className="inline-flex rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                App help chat
              </Link>
            </div>
            <p className="text-xs text-zinc-600">
              The <span className="text-zinc-500">Youth Dev assistant</span> is below on this page. Use{" "}
              <span className="text-zinc-500">Play hub</span> or <span className="text-zinc-500">/coach</span>{" "}
              for the same chat elsewhere.
            </p>
          </div>

          <div className="relative z-0 min-w-0">
            <div className="glass-panel relative overflow-hidden p-8 shadow-card animate-float">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-bloom-500/30 blur-2xl" />
              <p className="text-xs font-semibold uppercase tracking-widest text-aqua-400">
                Preview card
              </p>
              <p className="mt-4 font-display text-2xl text-white">
                Your symbolic identity
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Example output shape (real copy is generated for you):
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-bloom-300">✦</span> Curious · Steady ·
                  Warm-hearted
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-aqua-400">✦</span>{" "}
                  <span className="text-gradient font-semibold">
                    Riverlight Thinker
                  </span>
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 p-4 text-zinc-400">
                  “You show up for people in quiet ways. That kind of loyalty is a
                  superpower…”
                </li>
              </ul>
            </div>
          </div>
        </div>

        <HomeEmbeddedCoach />

        <footer className="mt-20 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/5 pt-10 text-xs text-zinc-600">
          <Link className="hover:text-zinc-400" href="/profile">
            Living profile
          </Link>
          <Link className="hover:text-zinc-400" href="/check-in">
            Check-in
          </Link>
          <Link className="hover:text-zinc-400" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-zinc-400" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-zinc-400" href="/data-rights">
            Data &amp; rights
          </Link>
        </footer>
      </div>
    </div>
  );
}
