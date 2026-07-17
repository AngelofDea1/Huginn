"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { EnableNotificationsButton } from "@/components/push-notifications";

type Fixture = {
  id: string;
  home: string;
  away: string;
  kickoffIso: string; // raw ISO string for date grouping
  time: string;       // formatted local time for display
  status: "LIVE" | "SOON" | "FT";
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

type Message = {
  from: "user" | "huginn";
  text: string;
  ts: number;
};

const STORAGE_KEY = "huginn_chat_v1";
const SESSION_KEY = "huginn_session_v1";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
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
  text: "Connected to TxLINE.\n\n/follow [team] · live alerts for any match\n/live · what's on right now\n/schedule · upcoming fixtures\n/stats [player] · career profile & injury history\n/vibe [mode] · hype, tactical, funny, balanced\n/help · full command list\n\nClick a match on the left to follow it, or type below.",
  ts: Date.now(),
};

const quickCmds = ["/live", "/schedule", "/follow Brazil", "/stats Mbappé", "/vibe hype", "/help"];

export default function LiveChatPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load session + history from localStorage on mount ───────────────────────
  useEffect(() => {
    const { sessionId: sid, messages: stored } = loadStored();
    sessionIdRef.current = sid;
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
      const toStore = messages.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        kickoffIso: m.kickoff_time || new Date().toISOString(),
        time: m.minute ? `${m.minute}'` : "LIVE",
        status: "LIVE" as const,
        minute: m.minute ?? null,
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
      }));

      const upcomingList: Fixture[] = (data.upcoming || []).map((m: any) => {
        const kickoff = new Date(m.kickoff_time);
        const t = kickoff.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: String(m.id),
          home: m.home_team?.name || "Home",
          away: m.away_team?.name || "Away",
          kickoffIso: m.kickoff_time,
          time: t,
          status: "SOON" as const,
          minute: null,
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

  // ── Sync messages from server ────────────────────────────────────────────────
  const syncMessages = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionIdRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        if (data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("Failed to sync messages:", err);
    }
  }, []);

  // ── Auto-refresh: 10s when any match is live, 30s otherwise ─────────────────
  useEffect(() => {
    const hasLive = fixtures.some((f) => f.status === "LIVE");
    const interval = setInterval(fetchScores, hasLive ? 10_000 : 30_000);
    return () => clearInterval(interval);
  }, [fixtures, fetchScores]);

  // ── Periodic background message synchronization ──────────────────────────────
  useEffect(() => {
    syncMessages();
    const interval = setInterval(syncMessages, 4000);
    return () => clearInterval(interval);
  }, [syncMessages]);

  // ── Send a message ───────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { from: "user", text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: trimmed }),
      });
      await syncMessages();
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "huginn", text: "Connection error. Make sure the server is reachable.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending, syncMessages]);

  const handleFixtureClick = useCallback((f: Fixture) => {
    setSelectedFixture(f);
    send(`/follow ${f.home}`);
  }, [send]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    const newSid = "web_" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(SESSION_KEY, newSid);
    sessionIdRef.current = newSid;
    setMessages([welcomeMessage]);
  };

  // ── Group fixtures by date ───────────────────────────────────────────────────
  const grouped = fixtures.reduce<Record<string, Fixture[]>>((acc, f) => {
    const label = f.status === "LIVE" ? "🔴 Live Now" : formatDate(f.kickoffIso);
    if (!acc[label]) acc[label] = [];
    acc[label].push(f);
    return acc;
  }, {});

  // Ensure Live Now appears first
  const groupOrder = Object.keys(grouped).sort((a) => (a === "🔴 Live Now" ? -1 : 1));

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      <section className="py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center text-center mb-10">
            <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-6">
              Live Chat
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
              Chat with Huginn directly. Click a fixture to follow it, alerts fire automatically into this window.
            </p>
          </div>


          <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">

            {/* ── Left: Fixtures ─────────────────────────────────────────── */}
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
                <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
                  <span className="text-4xl">⚽</span>
                  <p className="text-sm font-medium text-foreground">No matches right now</p>
                  <p className="text-xs text-muted-foreground">World Cup fixtures will appear here live</p>
                  <p className="text-[10px] text-muted-foreground/60">Auto-refreshes every 30 seconds</p>
                </div>
              )}

              <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
                {groupOrder.map((label) => (
                  <div key={label}>
                    {/* Date group header */}
                    <div className="px-5 py-2 bg-secondary/30 border-b border-border">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                        {label}
                      </span>
                    </div>

                    <div className="divide-y divide-border">
                      {grouped[label].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleFixtureClick(f)}
                          className={`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${
                            selectedFixture?.id === f.id
                              ? "bg-primary/5 border-l-2 border-l-primary"
                              : ""
                          }`}
                        >
                          {/* Status row */}
                          <div className="flex items-center justify-between mb-2">
                            {f.status === "LIVE" ? (
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm">
                                {f.minute ? `● ${f.minute}'` : "● LIVE"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                                {f.time}
                              </span>
                            )}
                          </div>

                          {/* Teams + score */}
                          <div className="flex items-center justify-between text-sm gap-2">
                            <span className="font-medium truncate flex-1 text-left">{f.home}</span>
                            {f.homeScore !== null ? (
                              <span className="font-mono font-bold text-base shrink-0 tabular-nums">
                                {f.homeScore}–{f.awayScore}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs shrink-0">vs</span>
                            )}
                            <span className="font-medium truncate flex-1 text-right">{f.away}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Chat ───────────────────────────────────────────── */}
            <div
              className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              style={{ minHeight: 600 }}
            >
              {/* Chat header — Huginn identity + clear history */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <img
                  src="/raven-logo-v2.jpeg"
                  alt="Huginn"
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="text-sm font-semibold">Huginn</div>
                  <div className="text-xs text-muted-foreground">
                    Live match intelligence · World Cup 2026
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1"
                  >
                    Clear history
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 p-4 space-y-3 overflow-y-auto"
                style={{ minHeight: 340, maxHeight: 520 }}
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
              <div className="px-4 py-3 border-t border-border bg-secondary/20 flex gap-2 overflow-x-auto scrollbar-hide">
                {quickCmds.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    disabled={sending}
                    className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 min-h-[36px]"
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
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30 active:scale-95"
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
