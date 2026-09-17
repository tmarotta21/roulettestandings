import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/prisma";
import { getMeta } from "@/lib/queries";
import { syncLiveScores } from "@/lib/sync";

export const runtime = "nodejs";

const COOLDOWN_MS = 15_000;
let inflight: Promise<Awaited<ReturnType<typeof syncLiveScores>>> | null = null;

export async function POST() {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "No database" }, { status: 503 });
  }

  const meta = await getMeta();
  const age = meta?.lastSyncedAt
    ? Date.now() - meta.lastSyncedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (age < COOLDOWN_MS) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      week: meta?.nflWeek ?? null,
      message: "Scores are already fresh.",
    });
  }

  try {
    if (!inflight) {
      inflight = syncLiveScores().finally(() => {
        inflight = null;
      });
    }
    const result = await inflight;
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.skipped
        ? "Nothing to sync yet."
        : `Updated week ${result.week} live scores.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
