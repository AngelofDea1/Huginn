"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AsciiCube } from "@/components/landing/ascii-cube";

// Animated ASCII generators mapped directly to feature names
const asciiAnimations = {
  liveMatch: (frame: number) => {
    // Live Match Updates - Football field with ball movement
    const ballPos = frame % 4;
    const positions = [
      `   GOAL! ⚽
  ┌─────────┐
  │ • ·  ·  │
  │  · ·  · │
  │ ·  ·  · │
  └─────────┘`,
      `  MATCH LIVE
  ┌─────────┐
  │·  ·  ·· │
  │ · · ·  ·│
  │ · ·  · ·│
  └─────────┘`,
      `  3-2 FINAL
  ┌─────────┐
  │ ··  ·  ·│
  │·  · · · │
  │  · ·  ··│
  └─────────┘`,
      `  KICKOFF!
  ┌─────────┐
  │ · · · · │
  │ · ⚽ · · │
  │ · · · · │
  └─────────┘`,
    ];
    return positions[ballPos];
  },
  smartAlerts: (frame: number) => {
    // Smart Alerts - Notification flowing to phone
    const phase = frame % 4;
    const flows = [
      `  ALERT
  ┌─ GOAL ─┐
  │ 🔔⚽    │
  │    →  📱│
  └────────┘`,
      `  RED CARD
  ┌ ALERT  ┐
  │    🔔  │
  │   →📱  │
  └────────┘`,
      `  INJURY
  ┌─ ALERT ┐
  │       │
  │    📱 │
  │ 🔔  ← │
  └────────┘`,
      `  CORNER
  ┌ ALERT  ┐
  │ ↓      │
  │📱 ← 🔔 │
  └────────┘`,
    ];
    return flows[phase];
  },
  oneCommand: (frame: number) => {
    // One Command Setup - WhatsApp command activation
    const stages = [
      `  SETUP
  /add huginn
  
  ✓ Active
  ────────`,
      `  TYPE:
  /help
  
  ✓ Loaded
  ────────`,
      `  READY!
  /stats
  
  ✓ Running
  ────────`,
      `  LIVE
  /scores
  
  ✓ Online
  ────────`,
    ];
    return stages[frame % stages.length];
  },
  aiCommentary: (frame: number) => {
    // AI Commentary - Animated analysis chart
    const heights = [
      [1, 3, 2, 1],
      [2, 1, 3, 2],
      [3, 2, 1, 3],
      [1, 2, 3, 1],
    ];
    const h = heights[frame % heights.length];
    const bar = (height: number) => {
      if (height === 3) return "█";
      if (height === 2) return "▄";
      return "▁";
    };
    return `  AI INSIGHT
  ${bar(h[0])} ${bar(h[1])} ${bar(h[2])} ${bar(h[3])}
  • • • •
  Possession`;
  },
  liveOdds: (frame: number) => {
    // Live Odds - Betting line movement
    const odds = [
      `  1.80 ▼
  Man City
  ──────
  Draw
  2.10 ▲
  ──────`,
      `  1.75 ↘
  Man City
  ──────
  Draw
  2.15 ↗`,
      `  1.82 ▲
  Man City
  ──────
  Draw
  2.08 ▼`,
      `  1.78 ↓
  Man City
  ──────
  Draw
  2.12 ↑`,
    ];
    return odds[frame % odds.length];
  },
  playerStats: (frame: number) => {
    // Player Stats - Player profile data
    const stats = [
      `  HAALAND
  ⚽ Goals: 12
  🎯 Assists: 5
  ─────────
  Form: HOT`,
      `  DE BRUYNE
  ⚽ Goals: 3
  🎯 Assists: 8
  ─────────
  Form: HOT`,
      `  FODEN
  ⚽ Goals: 7
  🎯 Assists: 6
  ─────────
  Form: GOOD`,
      `  PHILLIPS
  ⚽ Goals: 0
  🎯 Assists: 2
  ─────────
  Form: OK`,
    ];
    return stats[frame % stats.length];
  },
};

const features = [
  {
    title: "Live Match Updates",
    description: "Real-time goals, assists, and possession stats delivered instantly to your WhatsApp chat.",
    animationKey: "liveMatch" as const,
  },
  {
    title: "Smart Alerts",
    description: "Custom notifications for your favorite teams. Never miss a goal, card, or substitution.",
    animationKey: "smartAlerts" as const,
  },
  {
    title: "AI Commentary",
    description: "Get instant AI-powered analysis and predictions for every match moment.",
    animationKey: "aiCommentary" as const,
  },
  {
    title: "Live Odds Updates",
    description: "Real-time betting odds and line movements from multiple sportsbooks.",
    animationKey: "liveOdds" as const,
  },
  {
    title: "Player Stats",
    description: "Type /stats [player] for a full career profile — goals, assists, playing style, strengths, and injury history for any player at the tournament.",
    animationKey: "playerStats" as const,
  },
  {
    title: "One Command Setup",
    description: "Add Huginn to any WhatsApp group with a single command. No registration needed.",
    animationKey: "oneCommand" as const,
  },
];

function AnimatedAscii({ animationKey }: { animationKey: keyof typeof asciiAnimations }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const getAscii = useCallback(() => {
    return asciiAnimations[animationKey](frame);
  }, [animationKey, frame]);

  return (
    <pre className="font-mono text-xs text-primary leading-tight whitespace-pre">
      {getAscii()}
    </pre>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-xl p-8 border border-border bg-card transition-all duration-700 hover:border-primary/50 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Animated ASCII Icon */}
      <div className="mb-6 h-20 flex items-center">
        <AnimatedAscii animationKey={feature.animationKey} />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-32 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Centered Header with ASCII cube */}
        <div className="flex flex-col items-center text-center mb-10">

          <h2
            className={`text-3xl lg:text-5xl font-semibold tracking-tight mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
          >
            <span className="text-balance">Everything a football fan needs.</span>
          </h2>
          <p
            className={`text-lg text-muted-foreground leading-relaxed transition-all duration-700 delay-100 mb-8 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
          >
            From live match updates to AI-powered analysis, Huginn brings the complete football experience to your WhatsApp.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
