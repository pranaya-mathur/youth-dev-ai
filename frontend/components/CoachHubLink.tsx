"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COACH_HUB = "/play#coach";

function scrollToCoach() {
  requestAnimationFrame(() => {
    document.getElementById("coach")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** Play hub embeds coach; same-route navigation must scroll manually. */
export function CoachHubLink({
  variant,
  label = "Coach",
}: {
  variant: "desktop" | "mobile";
  label?: string;
}) {
  const pathname = usePathname();
  const className =
    variant === "desktop"
      ? "rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition duration-200 hover:bg-white/[0.06] hover:text-zinc-200"
      : "shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

  return (
    <Link
      href={COACH_HUB}
      scroll={false}
      className={className}
      onClick={(e) => {
        if (pathname === "/play") {
          e.preventDefault();
          window.history.pushState(null, "", COACH_HUB);
          scrollToCoach();
        }
      }}
    >
      {label}
    </Link>
  );
}
