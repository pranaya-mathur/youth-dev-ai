"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { levelFromXp, loadGamification } from "@/lib/gamification";

export function NavProgress() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    setXp(loadGamification().xp);
  }, [pathname]);

  if (xp <= 0) return null;

  return (
    <Link
      href="/play"
      className="rounded-full border border-sun-400/30 bg-sun-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sun-200 hover:bg-sun-400/20"
      title="Open Play hub"
    >
      Lv {levelFromXp(xp)} · {xp} XP
    </Link>
  );
}
