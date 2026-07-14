"use client";

import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-[0.02] grid-pattern z-0" />
      <div className="absolute top-[-10%] left-[-20%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="border-b border-border pb-8 mb-12">
          <span className="font-mono text-xs text-primary tracking-widest uppercase mb-3 block">Legals</span>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              Huginn (“we”, “us”, or “our”) operates a real-time World Cup companion service via web push notifications and WhatsApp. 
              We value your privacy and are committed to protecting it. This Privacy Policy explains what data we collect, how we use it, 
              and how we keep your notifications flowing securely.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <p>
              To keep Huginn fully functional without tedious signup forms, we collect the bare minimum needed:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Push Subscriptions:</strong> If you enable browser alerts, we store your Web Push subscription endpoint 
                and encryption keys (provided securely by your browser) in our database.
              </li>
              <li>
                <strong className="text-foreground">Followed Teams:</strong> We save which country teams you choose to follow (e.g. Brazil, Germany) 
                so we only send you notifications for the matches you care about.
              </li>
              <li>
                <strong className="text-foreground">Session Identifier:</strong> A randomly generated Session ID is stored in your local storage 
                to connect your web browser instance to your team preferences.
              </li>
              <li>
                <strong className="text-foreground">WhatsApp Interaction:</strong> If you add our bot to a group or chat directly, we process incoming messages 
                to parse commands like <code className="text-primary font-mono font-semibold">/follow</code> or <code className="text-primary font-mono font-semibold">/style</code>. We do not log or store group message history.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Data</h2>
            <p>
              We only use your data to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Deliver instant goal alerts, red cards, and match-event commentary.</li>
              <li>Filter matches based on your followed teams (preventing spam).</li>
              <li>Maintain your configured AI commentary style preferences (hype, tactical, funny, balanced).</li>
            </ul>
            <p>
              We do not sell, trade, or share your subscription endpoints or preferences with third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Data Storage & Retention</h2>
            <p>
              Your subscription data is stored securely in our cloud database. If a push notification fails with a 
              <code className="text-foreground font-mono">410 Gone</code> or <code className="text-foreground font-mono">404 Not Found</code> 
              response (meaning you disabled notifications in your browser or they expired), we permanently purge your subscription and preferences from our storage immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Your Choices</h2>
            <p>
              You are in complete control of your data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To stop alerts in the browser, click the "Disable Notifications" toggle or block permissions in your browser settings.</li>
              <li>To stop alerts on WhatsApp, send <code className="text-foreground font-mono">/unfollow [team]</code> directly in the chat or group.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Contact Us</h2>
            <p>
              If you have any questions or feedback about this policy, please reach out to us at 
              <a href="mailto:privacy@huginn-sports.com" className="text-primary hover:underline ml-1">privacy@huginn-sports.com</a>.
            </p>
          </section>
        </div>
      </div>

      <FooterSection />
    </main>
  );
}
