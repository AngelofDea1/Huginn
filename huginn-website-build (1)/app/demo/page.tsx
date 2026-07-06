"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

// ── Fixtures ─────────────────────────────────────────────────────────────────
const fixtures = [
  { id: 1, home: "Portugal", away: "Spain", time: "20:00", status: "SOON", homeScore: null, awayScore: null },
  { id: 2, home: "Brazil", away: "Argentina", time: "17:00", status: "LIVE", homeScore: 1, awayScore: 0 },
  { id: 3, home: "France", away: "Germany", time: "23:00", status: "SOON", homeScore: null, awayScore: null },
  { id: 4, home: "England", away: "USA", time: "14:00", status: "FT", homeScore: 2, awayScore: 1 },
];

// ── Command responses ─────────────────────────────────────────────────────────
function getResponse(input: string): string {
  const cmd = input.trim().toLowerCase();
  if (cmd === "/live") {
    return "📡 LIVE NOW\n\nBrazil 1–0 Argentina (54')\nOdds: Brazil win 1.55 · Draw 3.80\n\nEngland 2–1 USA · FULL TIME";
  }
  if (cmd.startsWith("/follow ")) {
    const team = input.trim().slice(8).trim() || "that team";
    return `✅ Following ${team}\n\nYou'll receive automatic alerts for every ${team} match — goals, cards, odds shifts, and summaries.`;
  }
  if (cmd === "/schedule") {
    return "📅 UPCOMING\n\nPortugal vs Spain · 20:00\nFrance vs Germany · 23:00\nItaly vs Netherlands · 02:00 (tomorrow)";
  }
  if (cmd === "/status") {
    return "📋 YOUR FOLLOWS\n\nNo teams followed yet.\nSend /follow [team] to start tracking a match.";
  }
  if (cmd === "/vibe hype") return "🔥 Vibe set to HYPE\n\nEvery goal treated like a cup final. Loud, dramatic, and relentless.";
  if (cmd === "/vibe tactical") return "📊 Vibe set to TACTICAL\n\nxG, formation shifts, and market movements explained cleanly.";
  if (cmd === "/vibe funny") return "😂 Vibe set to FUNNY\n\nNothing is presented straight. Banter mode active.";
  if (cmd === "/vibe balanced") return "⚖️ Vibe set to BALANCED\n\nFactual and easy to read. Default mode restored.";
  if (cmd === "/help") {
    return "📋 COMMANDS\n\n/follow [team] · start tracking\n/unfollow [team] · stop tracking\n/live · active matches now\n/schedule · upcoming fixtures\n/status · your active follows\n/vibe hype|tactical|funny|balanced";
  }
  if (cmd.startsWith("/")) {
    return `Unknown command: ${input.trim()}\n\nTry /help for the full list.`;
  }
  return "Send a command to get started. Try /live or /follow Brazil.";
}

type Message = { from: "user" | "huginn"; text: string };

const welcomeMessage: Message = {
  from: "huginn",
  text: "Huginn · connected to TxLINE.\n\n/follow [team] · start tracking a match\n/live · see what is on right now\n/vibe [mode] · hype, tactical, funny, balanced\n/status · check your active follows\n/help · full list\n\nClick a match on the left, or type below.",
};

const quickCmds = ["/live", "/schedule", "/follow Brazil", "/vibe hype", "/help"];

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<(typeof fixtures)[0] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { from: "user", text: trimmed };
    const botMsg: Message = { from: "huginn", text: getResponse(trimmed) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const handleFixtureClick = (f: (typeof fixtures)[0]) => {
    setSelectedFixture(f);
    const followCmd = `/follow ${f.home}`;
    const userMsg: Message = { from: "user", text: followCmd };
    const botMsg: Message = { from: "huginn", text: getResponse(followCmd) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Header */}

          <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-4">
            Try Huginn in your browser.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-12">
            Type any command below to test the Huginn assistant live. Click a match to auto-follow it.
          </p>

          <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">

            {/* ── Left: Live Scores ───────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Live Scores</span>
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <span className="text-base leading-none">↻</span> Update scores
                </button>
              </div>
              <div className="divide-y divide-border">
                {fixtures.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFixtureClick(f)}
                    className={`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${selectedFixture?.id === f.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${f.status === "LIVE"
                            ? "text-primary bg-primary/15"
                            : f.status === "FT"
                              ? "text-muted-foreground bg-secondary"
                              : "text-muted-foreground bg-secondary"
                          }`}
                      >
                        {f.status === "LIVE" ? "● LIVE" : f.status === "FT" ? "FT" : f.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.home}</span>
                      {f.homeScore !== null ? (
                        <span className="font-mono font-bold text-base">
                          {f.homeScore}–{f.awayScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">vs</span>
                      )}
                      <span className="font-medium">{f.away}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: Chat ──────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 560 }}>

              {/* Chat header */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                  HG
                </div>
                <div>
                  <div className="text-sm font-semibold">Huginn Assistant</div>
                  <div className="text-xs text-muted-foreground">Live match intelligence · World Cup 2026</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-primary font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  connected to TxLINE
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 380 }}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${m.from === "huginn"
                          ? "bg-secondary border border-border text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                        }`}
                    >
                      {m.from === "huginn" && (
                        <div className="text-xs text-primary font-bold font-mono mb-1.5 tracking-wide">HUGINN</div>
                      )}
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick commands */}
              <div className="px-5 py-3 border-t border-border bg-secondary/20 flex gap-2 flex-wrap">
                {quickCmds.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border flex gap-3 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Type a command (e.g. /live, /follow Brazil, /vibe hype)…"
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => send(input)}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
                  aria-label="Send"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
