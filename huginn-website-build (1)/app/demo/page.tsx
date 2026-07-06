"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

// ── Fixtures ─────────────────────────────────────────────────────────────────
type Fixture = {
  id: string;
  home: string;
  away: string;
  time: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

type Message = { from: "user" | "huginn"; text: string };

const welcomeMessage: Message = {
  from: "huginn",
  text: "Huginn · connected to TxLINE.\n\n/follow [team] · start tracking a match\n/live · see what is on right now\n/vibe [mode] · hype, tactical, funny, balanced\n/status · check your active follows\n/help · full list\n\nClick a match on the left, or type below.",
};

const quickCmds = ["/live", "/schedule", "/follow Brazil", "/vibe hype", "/help"];

export default function DemoPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Generate a simple session ID for tracking web follows/vibe
  useEffect(() => {
    setSessionId("web_" + Math.random().toString(36).substring(2, 11));
    fetchScores();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchScores() {
    setLoading(true);
    try {
      const res = await fetch("/api/live");
      const data = await res.json();
      
      const liveList = (data.live || []).map((m: any) => ({
        id: String(m.id),
        home: m.home_team?.name || "Home",
        away: m.away_team?.name || "Away",
        time: m.minute ? `${m.minute}'` : "LIVE",
        status: "LIVE",
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0
      }));

      const upcomingList = (data.upcoming || []).map((m: any) => {
        const t = new Date(m.kickoff_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        return {
          id: String(m.id),
          home: m.home_team?.name || "Home",
          away: m.away_team?.name || "Away",
          time: t,
          status: "SOON",
          homeScore: null,
          awayScore: null
        };
      });

      setFixtures([...liveList, ...upcomingList]);
    } catch (err) {
      console.error("Failed to load scores:", err);
    } finally {
      setLoading(false);
    }
  }

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { from: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      const data = await res.json();
      const botMsg: Message = { from: "huginn", text: data.reply || "Something went wrong. Try again." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: Message = { from: "huginn", text: "❌ Connection error. Is the backend running?" };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleFixtureClick = (f: Fixture) => {
    setSelectedFixture(f);
    send(`/follow ${f.home}`);
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
                <button 
                  onClick={fetchScores} 
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <span className={`text-base leading-none ${loading ? "animate-spin" : ""}`}>↻</span> {loading ? "Updating..." : "Update scores"}
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
                <img
                  src="/logo.jpeg"
                  alt="Huginn"
                  className="w-9 h-9 rounded-full object-cover border border-primary/30"
                />
                <div>
                  <div className="text-sm font-semibold">Huginn</div>
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
