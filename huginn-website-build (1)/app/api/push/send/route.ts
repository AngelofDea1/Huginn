/**
 * POST /api/push/send
 * Internal route used to broadcast a push notification to all subscribers.
 * Body: { title: string, body: string, url?: string }
 * Secured with PUSH_SEND_SECRET env var — pass as Authorization: Bearer <secret>
 */
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getAllSubscriptions } from "@/lib/subscriptions";
import { ensureVapid } from "@/lib/vapid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Protect with a simple bearer secret so only the bot server can trigger it
  const secret = process.env.PUSH_SEND_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  ensureVapid();

  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = await req.json();
  } catch {}

  const notification = JSON.stringify({
    title: payload.title || "Huginn Alert",
    body: payload.body || "Live match update!",
    url: payload.url || "/live-chat",
  });

  const subs = getAllSubscriptions();
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribers yet" });
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, notification);
        sent++;
      } catch {
        failed++;
      }
    })
  );

  return NextResponse.json({ sent, failed, total: subs.length });
}
