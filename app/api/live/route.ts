import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Phase 2: tournamentleagues `app/api/live/route.ts` (syncLiveScores, 15s cooldown). */
export async function POST() {
  return NextResponse.json({
    ok: false,
    message: "Live Sync is phase 2.",
  });
}
