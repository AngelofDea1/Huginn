import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_URL = process.env.HUGINN_BOT_URL || "https://huginn-w7d9.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Invalid request: sessionId is required" }, { status: 400 });
    }

    const secret = process.env.PUSH_SEND_SECRET || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }

    const upstream = await fetch(`${BOT_URL}/api/push/unsubscribe`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[/api/push/unsubscribe] upstream error:", upstream.status, errText);
      return NextResponse.json({ error: "Failed to unsubscribe on bot server" }, { status: 502 });
    }

    return NextResponse.json({ status: "unsubscribed" });
  } catch (err: any) {
    console.error("[/api/push/unsubscribe] error:", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
