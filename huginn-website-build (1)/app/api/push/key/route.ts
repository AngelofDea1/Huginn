import { NextResponse } from "next/server";
import { getPublicKey } from "@/lib/vapid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = getPublicKey();
  return NextResponse.json({ key });
}
