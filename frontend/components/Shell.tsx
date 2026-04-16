import type { ReactNode } from "react";
import Link from "next/link";
import { CoachHubLink } from "@/components/CoachHubLink";
import { NavProgress } from "@/components/NavProgress";

export function Shell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const quickLinks: { href: string; label: string }[] = [
    { href: "/play", label: "Play" },
    { href: "/play#coach", label: "Help" },
    { href: "/profile", label: "Profile" },
    { href: "/check-in", label: "Check-in" },
  ];

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-lg tracking-tight text-white/90 transition hover:text-white"
          >
            Youth<span className="text-gradient"> Dev</span>
          </Link>
          <nav
            className="hidden flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 sm:flex"
            aria-label="Main"
          >
            {quickLinks.map(({ href, label }) =>
              href === "/play#coach" ? (
                <CoachHubLink key={href} variant="desktop" label={label} />
              ) : (
                <Link
                  key={href}
                  className="rounded-lg px-2 py-1 text-zinc-500 transition duration-200 hover:bg-white/[0.06] hover:text-zinc-200"
                  href={href}
                >
                  {label}
                </Link>
              )
            )}
            <NavProgress />
          </nav>
        </div>
        <nav
          aria-label="Quick sections"
          className="flex items-center gap-2 overflow-x-auto border-t border-white/10 pt-3 [-webkit-overflow-scrolling:touch] sm:hidden"
        >
          {quickLinks.map(({ href, label }) =>
            href === "/play#coach" ? (
              <CoachHubLink key={href} variant="mobile" label={label} />
            ) : (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                {label}
              </Link>
            )
          )}
          <span className="shrink-0">
            <NavProgress />
          </span>
        </nav>
      </header>

      <div className="mb-8 space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aqua-400/95">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-[1.12] tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-xl text-base leading-relaxed text-zinc-400/95">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex-1">{children}</div>

      <footer className="mt-16 space-y-3 border-t border-white/5 pt-8 text-center text-xs text-zinc-600">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link className="text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline" href="/privacy">
            Privacy
          </Link>
          <span className="text-zinc-700">·</span>
          <Link className="text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline" href="/terms">
            Terms
          </Link>
          <span className="text-zinc-700">·</span>
          <Link
            className="text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            href="/data-rights"
          >
            Data &amp; rights
          </Link>
        </p>
        <p>
          Built for strengths-first identity—not labels. If you ever feel unsafe, talk to
          a trusted adult you know in real life.
        </p>
      </footer>
    </main>
  );
}
