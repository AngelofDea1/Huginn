"use client";

import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      
      {/* Grid Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-[0.02] grid-pattern z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24">
        {/* Centered Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="font-mono text-xs text-primary tracking-widest uppercase mb-3 block">Legals</span>
          <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
        </div>

        {/* Clean Centralized Section Layout */}
        <div className="space-y-6">
          
          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Huginn (we, us, or our) operates a real-time World Cup companion service via web push notifications and WhatsApp. 
              We value your privacy and are committed to protecting it. This Privacy Policy explains what data we collect, how we use it, 
              and how we keep your notifications flowing securely.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">2. Data We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              To keep Huginn fully functional without tedious signup forms, we collect the bare minimum needed:
            </p>
            <ul className="list-none space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <div>
                  <strong className="text-foreground">Push Subscriptions:</strong> If you enable browser alerts, we store your Web Push subscription endpoint 
                  and encryption keys (provided securely by your browser) in our database.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <div>
                  <strong className="text-foreground">Followed Teams:</strong> We save which country teams you choose to follow (e.g. Brazil, Germany) 
                  so we only send you notifications for the matches you care about.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <div>
                  <strong className="text-foreground">Session Identifier:</strong> A randomly generated Session ID is stored in your local storage 
                  to connect your web browser instance to your team preferences.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <div>
                  <strong className="text-foreground">WhatsApp Interaction:</strong> If you add our bot to a group or chat directly, we process incoming messages 
                  to parse commands like /follow or /style. We do not log or store group message history.
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">3. How We Use Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              We only use your data to:
            </p>
            <ul className="list-none space-y-3 text-sm text-muted-foreground mb-4">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Deliver instant goal alerts, red cards, and match-event commentary.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Filter matches based on your followed teams (preventing spam).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Maintain your configured AI commentary style preferences (hype, tactical, funny, balanced).</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not sell, trade, or share your subscription endpoints or preferences with third parties.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">4. Data Storage & Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your subscription data is stored securely in our cloud database. If a push notification fails with a 
              410 Gone or 404 Not Found response (meaning you disabled notifications in your browser or they expired), 
              we permanently purge your subscription and preferences from our storage immediately.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">5. Your Choices</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              You are in complete control of your data:
            </p>
            <ul className="list-none space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>To stop alerts in the browser, click the "Disable Notifications" toggle or block permissions in your browser settings.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>To stop alerts on WhatsApp, send /unfollow [team] directly in the chat or group.</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-semibold text-foreground mb-4">6. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions or feedback about this policy, please reach out to us at 
              <a href="mailto:privacy@huginn-sports.com" className="text-primary hover:underline ml-1">privacy@huginn-sports.com</a>.
            </p>
          </div>

        </div>
      </div>

      <FooterSection />
    </main>
  );
}
