"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

type Fixture = {
  id: string;
  home: string;
  away: string;
  time: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

type Message = {
  from: "user" | "huginn";
  text: string;
  ts: number; // epoch ms — used to show local time
};

const STORAGE_KEY = "huginn_chat_v1";
const SESSION_KEY = "huginn_session_v1";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadStored(): { sessionId: string; messages: Message[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = localStorage.getItem(SESSION_KEY);
    const messages: Message[] = raw ? JSON.parse(raw) : [];
    const sessionId = session || "web_" + Math.random().toString(36).slice(2, 11);
    if (!session) localStorage.setItem(SESSION_KEY, sessionId);
    return { sessionId, messages };
  } catch {
    const sessionId = "web_" + Math.random().toString(36).slice(2, 11);
    return { sessionId, messages: [] };
  }
}

const welcomeMessage: Message = {
  from: "huginn",
  text: "Connected to TxLINE.\n\n/follow [team] · live alerts for any match\n/live · what's on right now\n/schedule · upcoming fixtures\n/vibe [mode] · hype, tactical, funny, balanced\n/help · full command list\n\nClick a match on the left to follow it, or type below.",
  ts: Date.now(),
};

const quickCmds = ["/live", "/schedule", "/follow Brazil", "/vibe hype", "/help"];

export default function LiveChatPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load session + history from localStorage on mount ───────────────────────
  useEffect(() => {
    const { sessionId: sid, messages: stored } = loadStored();
    setSessionId(sid);
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      setMessages([welcomeMessage]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([welcomeMessage]));
    }
    fetchScores();
  }, []);

  // ── Persist messages to localStorage whenever they change ───────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      // Keep last 100 messages max
      const toStore = messages.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto-refresh live scores every 30 seconds ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(fetchScores, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch live + upcoming scores ─────────────────────────────────────────────
  const fetchScores = useCallback(async () => {
    setLoadingScores(true);
    try {
      const res = await fetch("/api/live");
      const data = await res.json();

      const liveList: Fixture[] = (data.live || []).map((m: any) => ({
        id: String(m.id),
        home: m.home_team?.name || "Home",
        away: m.away_team?.name || "Away",
        time: m.minute ? `${m.minute}'` : "LIVE",
        status: "LIVE",
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
      }));

      const upcomingList: Fixture[] = (data.upcoming || []).map((m: any) => {
        // Show time in the user's local timezone
        const t = new Date(m.kickoff_time).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: String(m.id),
          home: m.home_team?.name || "Home",
          away: m.away_team?.name || "Away",
          time: t,
          status: "SOON",
          homeScore: null,
          awayScore: null,
        };
      });

      setFixtures([...liveList, ...upcomingList]);
    } catch (err) {
      console.error("Failed to load scores:", err);
    } finally {
      setLoadingScores(false);
    }
  }, []);

  // ── Send a message ───────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { from: "user", text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      const data = await res.json();
      const botMsg: Message = {
        from: "huginn",
        text: data.reply || "Something went wrong. Try again.",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        from: "huginn",
        text: "Connection error. Make sure the server is reachable.",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [sessionId, sending]);

  const handleFixtureClick = useCallback((f: Fixture) => {
    setSelectedFixture(f);
    send(`/follow ${f.home}`);
  }, [send]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([welcomeMessage]);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      <section className="py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-3">
                Live Chat
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                Chat with Huginn directly. Click a fixture to follow it — alerts fire automatically into this window.
              </p>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 shrink-0"
            >
              Clear history
            </button>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">

            {/* ── Left: Live Scores ─────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Fixtures</span>
                <button
                  onClick={fetchScores}
                  disabled={loadingScores}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <span className={`text-sm leading-none ${loadingScores ? "animate-spin inline-block" : ""}`}>↻</span>
                  {loadingScores ? "Loading…" : "Refresh"}
                </button>
              </div>

              {fixtures.length === 0 && !loadingScores && (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                  No matches right now
                </div>
              )}

              <div className="divide-y divide-border">
                {fixtures.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFixtureClick(f)}
                    className={`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${
                      selectedFixture?.id === f.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                          f.status === "LIVE"
                            ? "text-emerald-400 bg-emerald-400/10"
                            : "text-muted-foreground bg-secondary"
                        }`}
                      >
                        {f.status === "LIVE" ? "● LIVE" : f.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="font-medium truncate">{f.home}</span>
                      {f.homeScore !== null ? (
                        <span className="font-mono font-bold text-sm shrink-0">
                          {f.homeScore}–{f.awayScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs shrink-0">vs</span>
                      )}
                      <span className="font-medium truncate text-right">{f.away}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: Chat ───────────────────────────────────────────── */}
            <div
              className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              style={{ minHeight: 560 }}
            >
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <img
                  src="/logo.jpeg"
                  alt="Huginn"
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="text-sm font-semibold">Huginn</div>
                  <div className="text-xs text-muted-foreground">
                    Live match intelligence · World Cup 2026
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  TxLINE
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 p-5 space-y-3 overflow-y-auto"
                style={{ maxHeight: 400 }}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      m.from === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        m.from === "huginn"
                          ? "bg-secondary border border-border text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.ts && (
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {formatTime(m.ts)}
                      </span>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-start">
                    <div className="bg-secondary border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick commands */}
              <div className="px-5 py-3 border-t border-border bg-secondary/20 flex gap-2 flex-wrap">
                {quickCmds.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    disabled={sending}
                    className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40"
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
                  onKeyDown={(e) => e.key === "Enter" && !sending && send(input)}
                  placeholder="Type a command or ask anything…"
                  disabled={sending}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => send(input)}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30"
                  aria-label="Send"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary-foreground"
                  >
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
