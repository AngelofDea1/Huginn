"use client";

import { useState, useEffect } from "react";

/**
 * PushNotifications — ambient top-right banner (shown once, auto-dismissed)
 * EnableNotificationsButton — reusable button with full iOS install guide
 * IOSInstallBanner — persistent top banner for iOS users in Safari (not standalone)
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

    let sessionId =
      typeof window !== "undefined" ? localStorage.getItem("huginn_session_v1") || "" : "";

    if (!sessionId && typeof window !== "undefined") {
      sessionId = "web_" + Math.random().toString(36).slice(2, 11);
      localStorage.setItem("huginn_session_v1", sessionId);
    }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub, sessionId }),
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
   iOS Install Guide Modal — full-screen step-by-step walkthrough
   Shown when iOS user clicks "Enable notifications"
───────────────────────────────────────────────────────────────── */
function IOSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom, 0)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f0f1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 36px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.8)",
          animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #00e676 0%, #00bcd4 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f8", lineHeight: 1.2 }}>Enable alerts on iPhone</div>
            <div style={{ fontSize: 12, color: "#6060a0", marginTop: 2 }}>Takes 30 seconds — Apple requires this</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#5050a0", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            {
              num: "1",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#00e676" strokeWidth="2"/>
                  <path d="M12 8v8M8 12h8" stroke="#00e676" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              title: "Tap the Share button",
              desc: "The square with an arrow pointing up — at the bottom of Safari",
            },
            {
              num: "2",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="9,22 9,12 15,12 15,22" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: 'Tap "Add to Home Screen"',
              desc: "Scroll down in the share menu until you see it",
            },
            {
              num: "3",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: 'Tap "Add" to confirm',
              desc: "Huginn will appear as an icon on your home screen",
            },
            {
              num: "4",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#00e676" strokeWidth="2"/>
                  <path d="M12 8v4l3 3" stroke="#00e676" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              title: "Open Huginn from Home Screen",
              desc: "Then come back to this page and tap Enable",
            },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(0,230,118,0.08)",
                border: "1px solid rgba(0,230,118,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f8", marginBottom: 2 }}>{step.title}</div>
                <div style={{ fontSize: 11.5, color: "#5858a0", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 22,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.05)",
          fontSize: 11,
          color: "#4040a0",
          lineHeight: 1.5,
        }}>
          🔒 This is an <strong style={{ color: "#6060c0" }}>Apple requirement</strong> — iPhones only support push notifications from apps installed on the Home Screen. It is not a Huginn limitation.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   iOS Install Banner — persistent top banner for iOS Safari users
   Shown on every page until dismissed or installed as PWA
───────────────────────────────────────────────────────────────── */
export function IOSInstallBanner() {
  const [show, setShow] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem("huginn_ios_banner_dismissed");
    if (isIOS && !isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <>
      {showGuide && <IOSGuideModal onClose={() => setShowGuide(false)} />}
      <style>{`
        @keyframes iosBannerIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ios-banner {
          animation: iosBannerIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
      `}</style>
      <div
        className="ios-banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "linear-gradient(90deg, #0a0a16 0%, #0d0d1f 100%)",
          borderBottom: "1px solid rgba(0,230,118,0.2)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Raven icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(0,230,118,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f8", lineHeight: 1.2 }}>
            Add Huginn to your Home Screen
          </div>
          <div style={{ fontSize: 10.5, color: "#5858a0", marginTop: 1 }}>
            Required on iPhone to get goal alerts
          </div>
        </div>

        <button
          onClick={() => setShowGuide(true)}
          style={{
            background: "#00e676",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          How to
        </button>

        <button
          onClick={() => {
            localStorage.setItem("huginn_ios_banner_dismissed", "1");
            setShow(false);
          }}
          aria-label="Dismiss"
          style={{ background: "transparent", border: "none", color: "#4040a0", fontSize: 18, cursor: "pointer", padding: "2px 6px", flexShrink: 0 }}
        >
          ✕
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Ambient bottom banner (fires once per user, 4s after first visit)
   Not shown on iOS Safari — the IOSInstallBanner handles that case
───────────────────────────────────────────────────────────────── */
export function PushNotifications() {
  const [state, setState] = useState<State>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show the generic banner on iOS — use IOSInstallBanner instead
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) return;

    const stored = localStorage.getItem("huginn_push");
    if (stored) return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .push-banner {
          position: fixed;
          top: 20px;
          right: 20px;
          width: min(400px, calc(100vw - 40px));
          animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        @media (max-width: 768px) {
          .push-banner {
            top: 12px;
            right: 12px;
            left: 12px;
            width: auto;
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
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsIOS(ios);
    setIsStandalone(standalone);

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

  if (!supported) return null;

  // Already subscribed
  if (state === "subscribed") {
    return (
      <div style={{ fontSize: 11, color: "#00e676", fontFamily: "monospace" }}>
        ✓ Notifications on
      </div>
    );
  }

  // iOS but not installed as PWA — show guide trigger
  if (isIOS && !isStandalone) {
    return (
      <>
        {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
        <button
          onClick={() => setShowIOSGuide(true)}
          style={{
            fontSize: 12,
            color: "#00e676",
            border: "1px solid rgba(0,230,118,0.3)",
            background: "rgba(0,230,118,0.08)",
            borderRadius: 8,
            padding: "6px 12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>📲</span> How to get alerts on iPhone
        </button>
      </>
    );
  }

  // Denied at OS level
  if (state === "denied" || (typeof Notification !== "undefined" && Notification.permission === "denied")) {
    return (
      <div style={{ fontSize: 11, color: "#5858a0", lineHeight: 1.5 }}>
        Notifications blocked. Go to <strong>Settings › Site permissions</strong> and allow notifications for this site, then reload.
      </div>
    );
  }

  // Default — show enable button
  return (
    <button
      onClick={() => handleEnable(setState)}
      disabled={state === "requesting"}
      style={{
        fontSize: 12,
        fontWeight: 600,
        background: "#00e676",
        color: "#000",
        border: "none",
        borderRadius: 8,
        padding: "6px 14px",
        cursor: state === "requesting" ? "wait" : "pointer",
        opacity: state === "requesting" ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {state === "requesting" ? "Requesting…" : "Enable match alerts"}
    </button>
  );
}
