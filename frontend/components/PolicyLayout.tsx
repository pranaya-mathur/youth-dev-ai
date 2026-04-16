"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function PolicyLayout({
  title,
  version,
  children,
}: {
  title: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-white/90 transition hover:text-white"
        >
          Youth<span className="text-gradient"> Dev</span>
        </Link>
        <Link
          href="/consent"
          className="text-sm text-aqua-400 transition hover:text-aqua-300"
        >
          ← Back to consent
        </Link>
      </header>
      <h1 className="font-display text-3xl text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-zinc-500">
        Version {version} · This document is a product template and must be reviewed by
        qualified legal counsel before production use.
      </p>
      <article className="mt-10 max-w-none space-y-8 text-sm leading-relaxed text-zinc-300">
        {children}
      </article>
    </main>
  );
}
