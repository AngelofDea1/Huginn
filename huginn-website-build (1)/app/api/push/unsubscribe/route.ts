import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    removeSubscription(sub);
    return NextResponse.json({ status: "unsubscribed" });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
