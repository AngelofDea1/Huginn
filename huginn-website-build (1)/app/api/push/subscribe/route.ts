import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/subscriptions";
import { ensureVapid } from "@/lib/vapid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  ensureVapid();
  try {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    addSubscription(sub);
    return NextResponse.json({ status: "subscribed" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
