/**
 * GET /api/live
 * Proxies live and upcoming fixtures from the Huginn bot server.
 * Cached for 10 seconds at the CDN edge to reduce load on the bot.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BOT_URL = process.env.HUGINN_BOT_URL || "https://huginn-w7d9.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${BOT_URL}/api/live`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 10 }, // cache for 10s
    });

    if (!res.ok) {
      return NextResponse.json({ live: [], upcoming: [] });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    });
  } catch {
    return NextResponse.json({ live: [], upcoming: [] });
  }
}
