"use client";

import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/Button";
import { CoachChatPanel } from "@/components/CoachChatPanel";

export default function CoachPage() {
  const router = useRouter();

  return (
    <Shell
      eyebrow="Assistant"
      title="Youth Dev help chat."
      subtitle="Ask how the app works, where features live, or what something means. Not therapy or crisis support—for emergencies, talk to a trusted adult or local services."
    >
      <CoachChatPanel />

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push("/play")}>
          Play hub
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    </Shell>
  );
}
