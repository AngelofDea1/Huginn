"use client";

import { Navigation } from "@/components/landing/navigation";
import { FeaturesSection } from "@/components/landing/features-section";
import { FooterSection } from "@/components/landing/footer-section";

const steps = [
  {
    num: "01",
    title: "Save the number",
    desc: "Save Huginn's WhatsApp number as a contact on your phone. That's the only thing you do outside WhatsApp.",
  },
  {
    num: "02",
    title: "Add it to your group",
    desc: "Open any WhatsApp group you're already in. Tap Add Participant, search Huginn, done. It joins silently.",
  },
  {
    num: "03",
    title: "Send one command",
    desc: "Type /follow Brazil in the group. From that moment, every goal, red card, and odds shift fires automatically straight into the chat.",
  },
];

const stack = [
  {
    name: "TxLINE",
    desc: "Live odds and match data across all 104 World Cup fixtures",
    // Official TxODDS logo — white on transparent
    logo: "https://txodds.net/wp-content/uploads/2025/11/TxODDS-White-on-Transparent-300x60.png",
    logoIsWide: true,
  },
  {
    name: "Llama 3.3 70B",
    desc: "AI commentary generation running on match events in real time",
    logo: "https://cdn.simpleicons.org/meta/ffffff",
    logoIsWide: false,
  },
  {
    name: "WhatsApp",
    desc: "Direct delivery to your group chat without extra apps",
    logo: "https://cdn.simpleicons.org/whatsapp/ffffff",
    logoIsWide: false,
  },
  {
    name: "Node.js",
    desc: "Always-on event processing and alert scheduling",
    logo: "https://cdn.simpleicons.org/nodedotjs/ffffff",
    logoIsWide: false,
  },
];

export default function FeaturesPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <div className="pt-0">
        {/* Animated ASCII Features Grid */}
        <FeaturesSection />


        {/* ── SECTION 2: Setup ─────────────────────────────────── */}
        <section className="py-24 bg-secondary/10 border-t border-border">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-4">
                Three steps is all you need.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div key={s.num} className="bg-card border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-primary/30 transition-colors">
                  <div>
                    <span className="font-mono text-xs text-primary mb-4 block tracking-widest">{s.num}</span>
                    <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: System Infrastructure ─────────────────── */}
        <section className="py-24 bg-secondary/20 border-t border-border">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-16 text-center">
              Built on what works.
            </h2>

            {/* Horizontal connected pipeline nodes */}
            <div className="relative">
              <div
                className="absolute top-[36px] left-0 right-0 h-px hidden lg:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(var(--border)) 10%, hsl(var(--border)) 90%, transparent)",
                }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6">
                {stack.map((s) => (
                  <div key={s.name} className="relative flex flex-col items-center text-center animate-fade-in">
                    {/* Logo box */}
                    <div className="relative z-10 mb-5">
                      <div className="w-[72px] h-[72px] rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm p-3">
                        <img
                          src={s.logo}
                          alt={s.name}
                          className={s.logoIsWide ? "w-full h-auto object-contain" : "w-8 h-8 object-contain"}
                          style={{ filter: "brightness(0) invert(1)" }}
                          onError={(e) => {
                            // Fallback: hide broken image, show name initials
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-2">{s.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <FooterSection />
    </main>
  );
}

// File ends cleanly here
