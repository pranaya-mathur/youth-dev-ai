"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { fetchAppHelpReply } from "@/lib/api";
import type { CoachChatMessage } from "@/lib/types";

const HELP_STARTERS = [
  "What can I do on the Home page?",
  "How do Play hub and XP work?",
  "Where is export or delete for my data?",
];

function TypingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Assistant is typing">
      <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-aqua-400/90 motion-safe:animate-coachTyping motion-reduce:animate-none motion-reduce:opacity-80"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoachChatPanel({
  className = "",
  panelClassName = "max-h-[min(60vh,520px)]",
}: {
  className?: string;
  panelClassName?: string;
}) {
  const [messages, setMessages] = useState<CoachChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi—I am your Youth Dev assistant. Ask me anything about this app: pages, Play hub, check-ins, profiles, privacy, footer links, or how things fit together. Short answers; not therapy or crisis support.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setErr(null);
    setInput("");
    const next: CoachChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetchAppHelpReply({ messages: [...next] });
      setDemo(res.demo_mode);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reach assistant.");
      setMessages((m) => m.slice(0, -1));
      if (!overrideText) setInput(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {demo ? (
        <p className="mb-3 shrink-0 rounded-2xl border border-sun-400/35 bg-gradient-to-r from-sun-400/12 to-bloom-500/10 px-4 py-3 text-xs leading-relaxed text-sun-100 shadow-sm">
          <strong className="text-sun-50">Sample mode:</strong> canned replies until the server has a
          real LLM key (or demo mode on).
        </p>
      ) : null}

      <div
        className={`glass-panel flex min-h-0 flex-1 flex-col overflow-hidden shadow-card ${panelClassName}`}
      >
        <div className="chat-scroll flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.length === 1 && !loading ? (
            <div className="mb-1 flex flex-wrap gap-2">
              {HELP_STARTERS.map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => void send(line)}
                  className="rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-left text-xs leading-snug text-zinc-200 shadow-sm transition duration-200 hover:border-aqua-400/35 hover:bg-white/10 hover:text-white"
                >
                  {line}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
              className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <span
                className={`px-1 text-[10px] font-semibold uppercase tracking-wider ${
                  m.role === "user" ? "text-bloom-300/90" : "text-aqua-400/90"
                }`}
              >
                {m.role === "user" ? "You" : "Assistant"}
              </span>
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[min(92%,24rem)] ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-bloom-500/35 to-bloom-600/25 text-white ring-1 ring-bloom-400/20"
                    : "border border-white/10 bg-black/40 text-zinc-100 ring-1 ring-white/5"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading ? <TypingBubble /> : null}
          <div ref={bottomRef} className="h-px shrink-0" />
        </div>
        <div className="shrink-0 border-t border-white/10 bg-black/20 p-4 sm:p-5">
          {err ? (
            <p
              className="mb-3 rounded-xl border border-bloom-400/30 bg-bloom-500/10 px-3 py-2 text-xs text-bloom-100"
              role="alert"
            >
              {err}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Ask about Youth Dev…"
              className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/12 bg-black/50 px-4 py-3 text-sm text-white shadow-inner placeholder:text-zinc-600 transition duration-200 focus:border-aqua-400/45 focus:outline-none focus:ring-2 focus:ring-aqua-400/20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="button" onClick={() => void send()} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
