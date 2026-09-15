import { NextRequest, NextResponse } from "next/server";
import { expectedAdminToken } from "@/lib/admin";
import { syncAll } from "@/lib/sync";

export const runtime = "nodejs";

function authorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  const cookie = request.cookies.get("rs_admin")?.value;
  const expected = expectedAdminToken();
  if (cookie && expected && cookie === expected) return true;
  return !cronSecret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
