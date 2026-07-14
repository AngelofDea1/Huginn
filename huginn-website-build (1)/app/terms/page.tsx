"use client";

import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export default function TermsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      {/* Grid Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-[0.02] grid-pattern z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24">
        {/* Centered Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="font-mono text-xs text-primary tracking-widest uppercase mb-3 block">Legals</span>
          <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
        </div>

        {/* Clean Centralized Section Layout */}
        <div className="space-y-6">

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By using Huginn - whether through the website, web chat, push notifications, or the WhatsApp bot - 
              you agree to these Terms of Service. If you do not agree, please discontinue use immediately.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Huginn is a real-time World Cup 2026 football companion service. It delivers:
            </p>
            <ul className="list-none space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Live match alerts (goals, red cards, half-time, full-time) via WhatsApp and browser push notifications.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>AI-generated match commentary powered by Llama 3.3 70B.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Live odds data sourced from TxLINE / TxODDS.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>An interactive web chat for on-demand match information and bot commands.</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">3. Eligibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use Huginn, particularly given that the service includes 
              live betting odds information. By using Huginn, you confirm that you meet this age requirement.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">4. Acceptable Use</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-none space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Use Huginn to spam, harass, or abuse other WhatsApp group members.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Attempt to reverse-engineer, disrupt, or exploit the bot server, API endpoints, or push notification infrastructure.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Use automated scripts to flood Huginn with commands at scale.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Misuse the /api/relink or internal admin endpoints if they are accessible.</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">5. Odds & Match Data Disclaimer</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All odds and match data are sourced in real time from TxLINE and may be subject to delay, inaccuracy, or unavailability. 
              Huginn does not encourage or facilitate gambling. Odds are displayed for informational and entertainment context only. 
              Always gamble responsibly and in accordance with the laws of your jurisdiction.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">6. AI-Generated Content</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Match commentary is generated automatically by an AI model (Llama 3.3 70B). 
              This content is produced in real time and has not been reviewed by a human editor. 
              Huginn is not responsible for any errors, inaccuracies, or tone in AI-generated commentary. 
              Use it for entertainment - not as the definitive record of match events.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">7. WhatsApp Terms Compliance</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Huginn's WhatsApp integration is built using open-source tooling. Usage of the bot must comply with 
              WhatsApp's own Terms of Service. Huginn is an independent service and is not affiliated with, endorsed by, 
              or sponsored by Meta Platforms, Inc. or WhatsApp LLC.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">8. Service Availability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Huginn is provided on a best-effort basis. We do not guarantee uninterrupted or error-free service. 
              The service is limited to the duration of the 2026 FIFA World Cup and may be discontinued or suspended at any time 
              without prior notice.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Huginn is provided "as is" without warranty of any kind. To the fullest extent permitted by law, 
              we disclaim all liability for any direct, indirect, incidental, or consequential damages arising from your use of 
              or inability to use the service, including but not limited to missed alerts, incorrect odds, or service downtime.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">10. Changes to These Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to update these Terms of Service at any time. Continued use of Huginn after 
              any changes constitutes your acceptance of the revised terms. The date at the top of this page 
              always reflects the most recent update.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">11. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about these terms? Reach us at{" "}
              <a href="mailto:legal@huginn-sports.com" className="text-primary hover:underline">
                legal@huginn-sports.com
              </a>.
            </p>
          </div>

        </div>
      </div>

      <FooterSection />
    </main>
  );
}
