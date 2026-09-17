import { NextRequest, NextResponse } from "next/server";
import { buildBoxScoreSide } from "@/lib/boxscore";
import { isAllowedLeague } from "@/lib/hosted";
import { usernameForRoster } from "@/lib/standings";
import {
  getLeague,
  getLeagueUsers,
  getMatchups,
  getNflPlayers,
  getRosters,
  getWeekProjections,
  pairMatchups,
} from "@/lib/sleeper";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get("league")?.trim() ?? "";
  const weekParam = Number(request.nextUrl.searchParams.get("week"));
  const rosterParam = Number(request.nextUrl.searchParams.get("roster"));
  if (!leagueId || !Number.isFinite(weekParam) || weekParam < 1 || !Number.isFinite(rosterParam)) {
    return NextResponse.json({ error: "Missing league, week, or roster" }, { status: 400 });
  }
  if (!(await isAllowedLeague(leagueId))) {
    return NextResponse.json({ error: "Unknown league" }, { status: 404 });
  }

  try {
    const [league, users, rosters, matchups, players] = await Promise.all([
      getLeague(leagueId),
      getLeagueUsers(leagueId),
      getRosters(leagueId),
      getMatchups(leagueId, weekParam),
      getNflPlayers(),
    ]);
    const ownerByRoster = new Map<number, string>();
    for (const roster of rosters) {
      if (roster.owner_id) ownerByRoster.set(roster.roster_id, roster.owner_id);
    }
    const sides = matchups.map((matchup) => ({
      rosterId: matchup.roster_id,
      matchupId: matchup.matchup_id ?? null,
      matchup,
    }));
    const pair = pairMatchups(sides).find((group) =>
      group.sides.some((side) => side.rosterId === rosterParam),
    );
    if (!pair) {
      return NextResponse.json({ error: "Matchup not found" }, { status: 404 });
    }

    let projections: Awaited<ReturnType<typeof getWeekProjections>> = [];
    try {
      projections = await getWeekProjections(league.season, weekParam);
    } catch {
      projections = [];
    }

    const scoring = league.scoring_settings ?? {};
    const boxSides = pair.sides.map((side) =>
      buildBoxScoreSide(
        side.matchup,
        usernameForRoster(side.rosterId, ownerByRoster, users),
        players,
        projections,
        scoring,
      ),
    );

    return NextResponse.json({
      leagueId,
      season: league.season,
      week: weekParam,
      sides: boxSides,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Box score failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
