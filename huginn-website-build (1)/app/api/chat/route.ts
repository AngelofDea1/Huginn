/**
 * POST /api/chat
 * Proxies the chat message to the Huginn WhatsApp bot server.
 * The bot handles AI responses via Groq and returns a reply.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_URL = process.env.HUGINN_BOT_URL || "https://huginn-w7d9.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message } = body;

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const upstream = await fetch(`${BOT_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { reply: "Huginn is offline right now. Try again in a moment." },
        { status: 200 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[/api/chat] upstream error:", err?.message);
    return NextResponse.json(
      { reply: "Couldn't reach Huginn right now. Try again shortly." },
      { status: 200 }
    );
  }
}
