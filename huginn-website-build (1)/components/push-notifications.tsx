"use client";

import { useState, useEffect } from "react";

/**
 * PushNotifications
 *
 * Flow:
 *  1. On first visit (after 4s delay), shows a native bottom-anchored banner.
 *  2. "Enable" button calls Notification.requestPermission() — the browser's
 *     own native permission dialog appears (works on Android/iOS PWA/desktop).
 *  3. On grant, subscribes via pushManager and POSTs to /api/push/subscribe.
 *  4. Choice is remembered in localStorage so the banner never re-appears.
 *
 * iOS note: Push requires the site to be added to the Home Screen as a PWA.
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

export function PushNotifications() {
  const [state, setState] = useState<State>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already decided — don't show again
    const stored = localStorage.getItem("huginn_push");
    if (stored) return;

    // Must have service worker + push support
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return; // Silently skip on unsupported browsers
    }

    // Already granted system-level — auto-subscribe silently
    if (Notification.permission === "granted") {
      doSubscribe();
      return;
    }

    // Already denied at system level — don't show banner
    if (Notification.permission === "denied") {
      localStorage.setItem("huginn_push", "denied");
      return;
    }

    // Show banner after 4 seconds
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, []);

  async function doSubscribe() {
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
      setVisible(false);
    } catch (err) {
      console.error("Push subscribe failed:", err);
      setState("denied");
      setVisible(false);
    }
  }

  async function handleEnable() {
    setState("requesting");

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission === "granted") {
      await doSubscribe();
    } else {
      localStorage.setItem("huginn_push", "denied");
      setState("denied");
      setVisible(false);
    }
  }

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
        .push-banner { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div
        className="push-banner"
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          width: "min(420px, calc(100vw - 24px))",
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
        {/* Bell icon */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(0,230,118,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="#00e676"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke="#00e676"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f8", marginBottom: 2 }}>
            Get goal alerts on this device
          </div>
          <div style={{ fontSize: 11.5, color: "#6060a0", lineHeight: 1.45 }}>
            Goals, red cards and odds moves — even when the page is closed.
          </div>
        </div>

        {/* Enable button */}
        <button
          onClick={handleEnable}
          disabled={state === "requesting"}
          style={{
            background: "#00e676",
            color: "#000",
            border: "none",
            borderRadius: 9,
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: state === "requesting" ? "wait" : "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            opacity: state === "requesting" ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {state === "requesting" ? "…" : "Enable"}
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: "#5050a0",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
            padding: "2px 4px",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </>
  );
}
