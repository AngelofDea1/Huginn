"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <div
          className={`relative rounded-2xl border border-border bg-card p-10 md:p-14 text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-balance">
              The raven is ready.
            </h2>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto">
              Chat directly with Huginn or invite it to any WhatsApp group. Simply send a message to get started.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Glassy Button */}
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 text-sm font-semibold border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md text-foreground transition-all duration-300 hover:bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-xl"
                asChild
              >
                <a href="/live-chat">Live Chat</a>
              </Button>

              {/* Press/Tactile Button */}
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/95 text-primary-foreground px-6 h-11 text-sm font-bold group rounded-xl border border-primary/20 shadow-[0_4px_0_#00a852] active:translate-y-[3px] active:shadow-[0_1px_0_#00a852] transition-all"
                asChild
              >
                <a href="/api/join">
                  Add Huginn Now
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
