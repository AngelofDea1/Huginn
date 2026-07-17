import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_URL = process.env.HUGINN_BOT_URL || "https://huginn-w7d9.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, subscription } = body;

    if (!sessionId || !subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid request: sessionId and subscription are required" }, { status: 400 });
    }

    const secret = process.env.PUSH_SEND_SECRET || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }

    const upstream = await fetch(`${BOT_URL}/api/push/subscribe`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId, subscription }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[/api/push/subscribe] upstream error:", upstream.status, errText);
      return NextResponse.json({ error: "Failed to register subscription on bot server" }, { status: 502 });
    }

    return NextResponse.json({ status: "subscribed" }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/push/subscribe] error:", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
