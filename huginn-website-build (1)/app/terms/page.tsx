"use client";

import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export default function TermsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />

      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-[0.02] grid-pattern z-0" />
      <div className="absolute top-[-10%] right-[-20%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="border-b border-border pb-8 mb-12">
          <span className="font-mono text-xs text-primary tracking-widest uppercase mb-3 block">Legals</span>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm md:text-base leading-relaxed text-muted-foreground">

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By using Huginn — whether through the website, web chat, push notifications, or the WhatsApp bot — 
              you agree to these Terms of Service. If you do not agree, please discontinue use immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Huginn is a real-time World Cup 2026 football companion service. It delivers:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Live match alerts (goals, red cards, half-time, full-time) via WhatsApp and browser push notifications.</li>
              <li>AI-generated match commentary powered by Llama 3.3 70B.</li>
              <li>Live odds data sourced from TxLINE / TxODDS.</li>
              <li>An interactive web chat for on-demand match information and bot commands.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Eligibility</h2>
            <p>
              You must be at least 18 years old to use Huginn, particularly given that the service includes 
              live betting odds information. By using Huginn, you confirm that you meet this age requirement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use Huginn to spam, harass, or abuse other WhatsApp group members.</li>
              <li>Attempt to reverse-engineer, disrupt, or exploit the bot server, API endpoints, or push notification infrastructure.</li>
              <li>Use automated scripts to flood Huginn with commands at scale.</li>
              <li>Misuse the <code className="text-foreground font-mono">/api/relink</code> or internal admin endpoints if they are accessible.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Odds & Match Data Disclaimer</h2>
            <p>
              All odds and match data are sourced in real time from TxLINE and may be subject to delay, inaccuracy, or unavailability. 
              Huginn does not encourage or facilitate gambling. Odds are displayed for informational and entertainment context only. 
              Always gamble responsibly and in accordance with the laws of your jurisdiction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. AI-Generated Content</h2>
            <p>
              Match commentary is generated automatically by an AI model (Llama 3.3 70B via Groq). 
              This content is produced in real time and has not been reviewed by a human editor. 
              Huginn is not responsible for any errors, inaccuracies, or tone in AI-generated commentary. 
              Use it for entertainment — not as the definitive record of match events.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. WhatsApp Terms Compliance</h2>
            <p>
              Huginn's WhatsApp integration is built using open-source tooling. Usage of the bot must comply with 
              WhatsApp's own Terms of Service. Huginn is an independent service and is not affiliated with, endorsed by, 
              or sponsored by Meta Platforms, Inc. or WhatsApp LLC.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Service Availability</h2>
            <p>
              Huginn is provided on a best-effort basis. We do not guarantee uninterrupted or error-free service. 
              The service is limited to the duration of the 2026 FIFA World Cup and may be discontinued or suspended at any time 
              without prior notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>
              Huginn is provided "as is" without warranty of any kind. To the fullest extent permitted by law, 
              we disclaim all liability for any direct, indirect, incidental, or consequential damages arising from your use of 
              or inability to use the service, including but not limited to missed alerts, incorrect odds, or service downtime.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Changes to These Terms</h2>
            <p>
              We reserve the right to update these Terms of Service at any time. Continued use of Huginn after 
              any changes constitutes your acceptance of the revised terms. The date at the top of this page 
              always reflects the most recent update.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>
              Questions about these terms? Reach us at{" "}
              <a href="mailto:legal@huginn-sports.com" className="text-primary hover:underline">
                legal@huginn-sports.com
              </a>.
            </p>
          </section>

        </div>
      </div>

      <FooterSection />
    </main>
  );
}
