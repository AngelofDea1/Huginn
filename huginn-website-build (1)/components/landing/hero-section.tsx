"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AsciiWave } from "./ascii-wave";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* ASCII Wave full width and height */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <AsciiWave className="w-full h-full" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-24">
        {/* Headline */}
        <div className="text-center max-w-5xl mx-auto mb-10">
          <h1 
            className={`text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95] mb-8 transition-all duration-700 delay-100 lg:text-7xl ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ fontFamily: 'var(--font-geist-pixel-line), monospace' }}
          >
            <span className="text-balance">Your World Cup.</span>
            <br />
            <span className="text-balance">Inside</span>{" "}
            <span className="text-primary">WhatsApp.</span>
          </h1>
          
          <p 
            className={`text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Goals, red cards, and odds shifts pushed to your WhatsApp.<br className="hidden md:inline" /> Chat directly with Huginn or invite it to any group.
          </p>

        </div>
        
        {/* CTAs */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Glassy Button */}
          <Button 
            size="lg" 
            className="h-11 px-6 text-sm font-semibold border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md text-foreground transition-all duration-300 hover:bg-white/[0.1] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            asChild
          >
            <a href="/live-chat">Live Chat</a>
          </Button>


          {/* Press/Tactile Button */}
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/95 text-primary-foreground px-6 h-11 text-sm font-bold group rounded-xl border border-primary/20 shadow-[0_4px_0_#00a852] active:translate-y-[3px] active:shadow-[0_1px_0_#00a852] transition-all cursor-pointer"
            asChild
          >
            <a href="/api/join">
              Add to WhatsApp
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>

        </div>
      </div>
    </section>
  );
}
