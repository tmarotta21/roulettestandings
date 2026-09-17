import { NextRequest, NextResponse } from "next/server";
import { expectedAdminToken } from "@/lib/admin";
import { imagesExistForWeek, markGeneratedImages, syncAll } from "@/lib/sync";
import { isNflWeekFinal } from "@/lib/nfl-final";
import { listHostedLeagues } from "@/lib/hosted";
import { maybePostWeeklyImages } from "@/lib/sleeper-chat";
import { getNflState, nflDisplayWeek } from "@/lib/sleeper";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const force = request.nextUrl.searchParams.get("force") === "1";
    const state = await getNflState();
    const week = nflDisplayWeek(state);
    const season = state.season ?? "2026";
    const final = await isNflWeekFinal(week);

    if (!final && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "week-not-final",
        week,
      });
    }

    if ((await imagesExistForWeek(week, season)) && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "already-generated",
        week,
      });
    }

    const sync = await syncAll();
    await markGeneratedImages(week, season);
    const hosted = await listHostedLeagues();
    const autoPostLeagues = hosted.filter((league) => league.autoChatPostEnabled);
    const chat = await maybePostWeeklyImages({
      week,
      season,
      sleeperLeagueIds: autoPostLeagues.map((league) => league.sleeperLeagueId),
    });
    return NextResponse.json({
      ok: true,
      skipped: false,
      week,
      season,
      sync,
      chat,
      message: chat.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
