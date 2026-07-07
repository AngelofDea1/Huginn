"use client";

import { useState, useEffect } from "react";

/**
 * PushNotifications — ambient bottom-banner (shown once, auto-dismissed)
 * EnableNotificationsButton — reusable button for embedding on any page
 *
 * iOS: push requires the site added to Home Screen as a PWA first.
 * Android Chrome: works directly from the browser.
 */

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type State = "idle" | "requesting" | "subscribed" | "denied" | "dismissed" | "unsupported";

async function doSubscribe(setState: (s: State) => void, onDone?: () => void) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch("/api/push/key");
    const { key } = await res.json();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    localStorage.setItem("huginn_push", "subscribed");
    setState("subscribed");
    onDone?.();
  } catch (err) {
    console.error("Push subscribe failed:", err);
    setState("denied");
    onDone?.();
  }
}

async function handleEnable(setState: (s: State) => void, setVisible?: (v: boolean) => void) {
  setState("requesting");

  if (typeof Notification === "undefined") {
    setState("unsupported");
    return;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "granted") {
    await doSubscribe(setState, () => setVisible?.(false));
  } else {
    localStorage.setItem("huginn_push", "denied");
    setState("denied");
    setVisible?.(false);
  }
}

/* ─────────────────────────────────────────────────────────────────
   Ambient bottom banner (fires once per user, 4s after first visit)
───────────────────────────────────────────────────────────────── */
export function PushNotifications() {
  const [state, setState] = useState<State>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("huginn_push");
    if (stored) return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      doSubscribe(setState);
      return;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      localStorage.setItem("huginn_push", "denied");
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    localStorage.setItem("huginn_push", "dismissed");
    setState("dismissed");
    setVisible(false);
  }

  if (!visible || state === "subscribed" || state === "dismissed" || state === "denied") {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .push-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: min(420px, calc(100vw - 24px));
          animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        @media (max-width: 768px) {
          .push-banner {
            bottom: 16px;
            left: 12px;
            right: 12px;
            width: auto;
            transform: none;
          }
        }
      `}</style>

      <div
        className="push-banner"
        style={{
          zIndex: 99999,
          background: "rgba(10,10,22,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,230,118,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f8", marginBottom: 2 }}>Get goal alerts on this device</div>
          <div style={{ fontSize: 11.5, color: "#6060a0", lineHeight: 1.45 }}>Goals, red cards and odds moves, even when the page is closed.</div>
        </div>

        <button
          onClick={() => handleEnable(setState, setVisible)}
          disabled={state === "requesting"}
          style={{ background: "#00e676", color: "#000", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: state === "requesting" ? "wait" : "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: state === "requesting" ? 0.6 : 1, transition: "opacity 0.2s" }}
        >
          {state === "requesting" ? "…" : "Enable"}
        </button>

        <button onClick={handleDismiss} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "#5050a0", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>
          ✕
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Inline button for embedding on any page (e.g. Live Chat)
   Shows current permission state and lets user (re-)enable at will.
───────────────────────────────────────────────────────────────── */
export function EnableNotificationsButton() {
  const [state, setState] = useState<State>("idle");
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const stored = localStorage.getItem("huginn_push");
    if (stored === "subscribed") setState("subscribed");
    else if (typeof Notification !== "undefined" && Notification.permission === "granted") setState("subscribed");
    else if (typeof Notification !== "undefined" && Notification.permission === "denied") setState("denied");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // iOS standalone detection
  const isStandalone = typeof window !== "undefined" && (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (!supported) return null;

  // Already subscribed
  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Notifications on
      </div>
    );
  }

  // iOS but not installed as PWA
  if (isIOS && !isStandalone) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setShowIOSGuide((v) => !v)}
          className="text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg px-3 py-1.5 font-semibold hover:bg-primary/20 transition-colors"
        >
          Enable notifications on iPhone
        </button>
        {showIOSGuide && (
          <div className="mt-3 p-4 rounded-2xl border border-border bg-card text-xs text-muted-foreground leading-relaxed space-y-2">
            <p className="font-semibold text-foreground">How to get alerts on iPhone</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow pointing up)</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top right</li>
              <li>Open Huginn from your Home Screen</li>
              <li>Come back here and tap Enable notifications</li>
            </ol>
            <p className="text-[10px] text-muted-foreground/70 pt-1">iPhone requires the app to be on your Home Screen before push notifications work. This is an Apple requirement.</p>
          </div>
        )}
      </div>
    );
  }

  // Denied at OS level
  if (state === "denied" || (typeof Notification !== "undefined" && Notification.permission === "denied")) {
    return (
      <div className="text-xs text-muted-foreground leading-relaxed">
        Notifications blocked in your browser settings. Go to <strong>Settings &gt; Site permissions</strong> and allow notifications for this site, then reload.
      </div>
    );
  }

  // Default — show enable button
  return (
    <button
      onClick={() => handleEnable(setState)}
      disabled={state === "requesting"}
      className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {state === "requesting" ? "Requesting…" : "Enable match alerts"}
    </button>
  );
}
