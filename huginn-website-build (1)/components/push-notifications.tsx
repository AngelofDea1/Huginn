"use client";

import { useState, useEffect } from "react";

/**
 * PushNotifications component
 * 
 * Handles service worker registration, push notification subscription,
 * and shows a floating banner prompting the user to enable notifications.
 * 
 * The banner appears after 3 seconds on first visit, and remembers
 * the user's choice in localStorage so it doesn't re-prompt.
 */
export function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if push is supported
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Check if already dismissed or subscribed
    const stored = localStorage.getItem("huginn-push");
    if (stored === "subscribed" || stored === "dismissed") {
      if (stored === "subscribed") setSubscribed(true);
      if (stored === "dismissed") setDismissed(true);
      return;
    }

    setSupported(true);

    // Register service worker
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Show banner after 3 seconds
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from our API
      const res = await fetch("/api/push/key");
      const { key } = await res.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      // Send subscription to our server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      setSubscribed(true);
      setVisible(false);
      localStorage.setItem("huginn-push", "subscribed");
    } catch (err) {
      console.error("Push subscription failed:", err);
      // If permission denied, hide the banner
      if (Notification.permission === "denied") {
        handleDismiss();
      }
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem("huginn-push", "dismissed");
  }

  if (!supported || dismissed || subscribed || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#0d0d1a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        maxWidth: "calc(100% - 32px)",
        width: 420,
        animation: "pushBannerIn 0.3s ease-out",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#f0f0f8",
            marginBottom: 4,
          }}
        >
          Enable match notifications
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#7070a0",
            lineHeight: 1.4,
          }}
        >
          Get goal alerts, red cards, and odds shifts even when the page is
          closed.
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        style={{
          background: "#00e676",
          color: "#000",
          border: "none",
          borderRadius: 10,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Enable
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "#7070a0",
          fontSize: 18,
          cursor: "pointer",
          padding: "4px 6px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
      <style>{`
        @keyframes pushBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

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
