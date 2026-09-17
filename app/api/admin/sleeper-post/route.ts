import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isAllowedLeague } from "@/lib/hosted";
import { maybePostLeagueImage } from "@/lib/sleeper-chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { sleeperLeagueId?: string };
  const sleeperLeagueId = body.sleeperLeagueId?.trim();
  if (!sleeperLeagueId) {
    return NextResponse.json({ error: "League ID required." }, { status: 400 });
  }
  if (!(await isAllowedLeague(sleeperLeagueId))) {
    return NextResponse.json({ error: "Unknown league" }, { status: 404 });
  }
  const result = await maybePostLeagueImage(sleeperLeagueId);
  return NextResponse.json(result);
}
