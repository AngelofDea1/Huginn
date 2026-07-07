"use client";

import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="relative border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div>
          <Link href="/" className="flex items-center gap-2 mb-3">
              <img
                src="/raven-logo.jpeg"
                alt="Huginn logo"
                className="w-8 h-8 rounded-full object-cover border border-white/10"
              />
              <span className="font-semibold tracking-tight">Huginn</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser.
            </p>
          </div>

          {/* Nav links — only pages that exist */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/features"  className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="/commands"  className="text-sm text-muted-foreground hover:text-foreground transition-colors">Commands</Link>
            <Link href="/live-chat"  className="text-sm text-muted-foreground hover:text-foreground transition-colors">Live Chat</Link>
            <a
              href="https://txline.txodds.com/documentation/worldcup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              TxLINE ↗
            </a>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 Huginn · World Cup 2026 · Built on TxLINE
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            Powered by Llama 3.3 70B · Baileys · Node.js
          </span>
        </div>
      </div>
    </footer>
  );
}
