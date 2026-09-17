import { NextRequest, NextResponse } from "next/server";
import { standingsImageResponse } from "@/lib/standings-image";
import { loadLeagueStandings } from "@/lib/standings";
import { isAllowedLeague } from "@/lib/hosted";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sleeperLeagueId: string }> },
) {
  const { sleeperLeagueId } = await context.params;
  if (!(await isAllowedLeague(sleeperLeagueId))) {
    return NextResponse.json({ error: "Unknown league" }, { status: 404 });
  }
  try {
    const board = await loadLeagueStandings(sleeperLeagueId);
    const download = request.nextUrl.searchParams.get("download") === "1";
    return standingsImageResponse(board, download);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
