"use client";

import { useState } from "react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

const manualCommands = [
  { cmd: "/follow [team]", desc: "Start receiving live alerts for every match featuring that team. Works in any WhatsApp group or direct chat." },
  { cmd: "/unfollow [team]", desc: "Stop receiving alerts for a specific team. Your other followed teams are not affected." },
  { cmd: "/live", desc: "Show all currently active World Cup matches, live scores, and current odds in a clean summary." },
  { cmd: "/schedule", desc: "View the full list of upcoming fixtures and kickoff times for the remainder of the tournament." },
  { cmd: "/status", desc: "See which teams you are currently following and which commentary vibe is active." },
  { cmd: "/vibe hype", desc: "Switch to high-energy, dramatic commentary. Every goal feels like a final." },
  { cmd: "/vibe tactical", desc: "Switch to calm, data-driven analysis. xG, formations, and odds movements explained clearly." },
  { cmd: "/vibe funny", desc: "Switch to light-hearted banter mode. Football is entertainment after all." },
  { cmd: "/vibe balanced", desc: "The default. Friendly, informative, and never annoying." },
];

const alertCards = [
  {
    tag: "GOAL ALERT",
    badge: "Fires within 30 seconds of the event",
    title: "GOAL · 67'",
    body: "Vinícius Jr scores for Brazil. 2–1.\n\nBrazil win odds drop from 2.10 to 1.45. The market has moved sharply on that goal.",
  },
  {
    tag: "RED CARD ALERT",
    badge: "Instant — includes odds impact",
    title: "RED CARD · 54'",
    body: "Müller dismissed for Germany. Straight red.\n\nGermany down to 10 men. Win odds shift from 1.80 to 3.20. A significant change in the match dynamic.",
  },
  {
    tag: "HALF-TIME REPORT",
    badge: "Auto-sent at the half-time whistle",
    title: "HALF TIME · Spain 1–0 England",
    body: "Spain dominated with 68% possession, 7 shots to 2. Odds: Spain 1.55 / Draw 4.20 / England 6.50.\n\nEngland will need to change shape in the second half.",
  },
  {
    tag: "ODDS SHIFT ALERT",
    badge: "Triggers on 15%+ odds movement",
    title: "MARKET MOVE · 31'",
    body: "Portugal odds drifted from 2.10 to 3.40 in under two minutes, representing a 62% swing.\n\nSomething changed in the market. Late team news or significant positioning.",
  },
];

const vibes = [
  {
    id: "hype",
    cmd: "/vibe hype",
    name: "Hype FC",
    desc: "Every goal treated like a cup final. Loud, dramatic, and relentless. Made for groups where the match is all that exists.",
    preview: "⚽ GOOOAL!! Vinícius EXPLODES past the keeper!! Brazil are ALIVE!! 2–1 and the crowd goes absolutely mental!! Odds PLUMMETING — Brazil now 1.44 favourites!! This. Is. FOOTBALL!! 🔥🔥🔥",
  },
  {
    id: "tactical",
    cmd: "/vibe tactical",
    name: "The Analyst",
    desc: "xG, formation shifts, and market movements explained cleanly. Built for groups that read the numbers, not just the scoreline.",
    preview: "GOAL · Vinícius Jr (67')\nBrazil 2–1. xG at time of goal: 1.82 vs 0.94.\n\nBrazil operating in a 4-3-3 transition shape. This goal exploited the half-space between Germany's left CB and LB. Odds adjusted: Brazil win 1.44 (from 2.10). A significant market movement.",
  },
  {
    id: "funny",
    cmd: "/vibe funny",
    name: "Banter FC",
    desc: "Nothing is presented straight. Works best in groups where the banter lasts longer than the match does.",
    preview: "lads lads lads. Vinícius just nutmegged the entire German defensive line and casually rolled it in like he was parking a car. 2–1. Germany's odds are now longer than their injury list. The raven has spoken 🦅",
  },
  {
    id: "balanced",
    cmd: "/vibe balanced",
    name: "Match Day",
    desc: "Factual and easy to read. Covers every event without editorialising. The default mode — works in any group.",
    preview: "GOAL · Vinícius Jr (67')\nBrazil 2–1 Germany.\n\nOdds updated: Brazil win 1.44 · Draw 4.10 · Germany 7.20.\n\nBrazil lead for the first time in the match.",
  },
];

function AlertBubble({ card }: { card: typeof alertCards[0] }) {
  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-border bg-card transition-all duration-300 hover:border-primary/30">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
        <span className="text-xs font-mono font-bold tracking-widest text-primary">
          {card.tag}
        </span>
        <span className="text-xs text-muted-foreground">{card.badge}</span>
      </div>
      <div className="flex-1 p-5">
        <div className="rounded-xl p-4 border border-border bg-background">
          <div className="font-semibold text-sm mb-2">{card.title}</div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {card.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommandsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Centered Header */}
          <div className="text-center mb-20">
            <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-4">
              Commands &amp; Alerts
            </h1>
          </div>

          {/* ── Manual commands ──────────────────────────────── */}
          <div className="mb-24">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <h2 className="text-lg font-semibold tracking-tight">Commands you send</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {manualCommands.map((c) => (
                <div
                  key={c.cmd}
                  className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/40 hover:shadow-[0_4px_20px_-4px_rgba(0,230,118,0.15)] transition-all duration-300"
                >
                  <code className="text-sm text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg w-fit font-mono font-bold tracking-wide">
                    {c.cmd}
                  </code>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Styled /help card */}
            <div className="bg-gradient-to-r from-primary/5 via-transparent to-transparent border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/45 transition-all duration-300">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-bold text-primary">// GETTING HELP</span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lost or need a quick refresher? Send this command straight to the chat at any time.
                </p>
              </div>
              <code className="text-sm text-primary bg-primary/15 border border-primary/30 px-4 py-2.5 rounded-xl font-mono font-bold tracking-wide shrink-0 w-fit">
                /help
              </code>
            </div>
          </div>

          {/* ── Commentary Voice Vibes (Interactive) ────────── */}
          <div className="mb-24">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <h2 className="text-lg font-semibold tracking-tight">Commentary Voice</h2>
            </div>
            
            <Tabs defaultValue="hype" className="w-full">
              <TabsList className="h-auto p-1 bg-card border border-border rounded-xl w-full grid grid-cols-4 mb-8">
                {vibes.map((v) => (
                  <TabsTrigger
                    key={v.id}
                    value={v.id}
                    className="flex flex-col gap-1 py-3 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-auto"
                  >
                    <code className="text-xs font-mono text-primary">{v.cmd}</code>
                    <span className="text-xs font-semibold hidden sm:block">{v.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {vibes.map((v) => (
                <TabsContent key={v.id} value={v.id}>
                  <div className="grid lg:grid-cols-2 gap-6 items-center">
                    <div>
                      <h3 className="text-2xl font-semibold mb-3">{v.name}</h3>
                      <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground font-semibold">
                          {v.name.toUpperCase()} PREVIEW
                        </span>
                      </div>
                      <div className="p-5">
                        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                          {v.preview}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* ── Real-Time Alerts (No duplicate list below it) ── */}
          <div className="mb-24">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <h2 className="text-lg font-semibold tracking-tight">Real-time Alerts</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {alertCards.map((card) => (
                <AlertBubble key={card.tag} card={card} />
              ))}
            </div>
          </div>

          {/* ── Redesigned CTA panel ─────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mt-24">
            <div>
              <h3 className="text-2xl font-semibold mb-2">Ready to use Huginn?</h3>
              <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                Chat directly with Huginn or add it to any WhatsApp group to get started.
              </p>
            </div>
            <div className="flex gap-4 flex-wrap shrink-0">
              <Link
                href="/live-chat"
                className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md text-foreground text-sm font-semibold px-6 py-3.5 rounded-xl hover:bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300"
              >
                Live Chat in Browser
              </Link>
              <a
                href="/api/join"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm px-6 py-3.5 rounded-xl border border-primary/20 shadow-[0_4px_0_#00a852] active:translate-y-[3px] active:shadow-[0_1px_0_#00a852] transition-all"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>

        </div>
      </section>

      <FooterSection />
    </main>
  );
}
