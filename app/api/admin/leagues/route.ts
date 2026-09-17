import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { slugifyLeagueName } from "@/lib/leagues";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { getLeague, normalizeSleeperLeagueId, settingNumber } from "@/lib/sleeper";
import { syncAll } from "@/lib/sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL is not set." }, { status: 400 });
  }
  const body = (await request.json()) as { sleeperLeagueId?: string };
  const sleeperLeagueId = body.sleeperLeagueId?.trim();
  if (!sleeperLeagueId) {
    return NextResponse.json({ error: "League ID required." }, { status: 400 });
  }
  try {
    const league = await getLeague(sleeperLeagueId);
    const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
    const playoffTeams = settingNumber(league.settings, "playoff_teams", 6);
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.excludedLeague.deleteMany({ where: { sleeperLeagueId } }),
      prisma.league.upsert({
        where: { sleeperLeagueId },
        create: {
          sleeperLeagueId,
          name: league.name,
          slug: slugifyLeagueName(league.name),
          season: league.season,
          previousSleeperLeagueId: normalizeSleeperLeagueId(league.previous_league_id),
          playoffWeekStart,
          playoffTeams,
          totalRosters: league.total_rosters ?? 12,
        },
        update: {
          name: league.name,
          slug: slugifyLeagueName(league.name),
          season: league.season,
          previousSleeperLeagueId: normalizeSleeperLeagueId(league.previous_league_id),
          playoffWeekStart,
          playoffTeams,
          totalRosters: league.total_rosters ?? 12,
        },
      }),
    ]);
    await syncAll();
    return NextResponse.json({ message: `Added ${league.name} and synced.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add league";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL is not set." }, { status: 400 });
  }
  const body = (await request.json()) as { sleeperLeagueId?: string };
  const sleeperLeagueId = body.sleeperLeagueId?.trim();
  if (!sleeperLeagueId) {
    return NextResponse.json({ error: "League ID required." }, { status: 400 });
  }
  await getPrisma().excludedLeague.upsert({
    where: { sleeperLeagueId },
    create: { sleeperLeagueId },
    update: {},
  });
  return NextResponse.json({ message: "Excluded from standings." });
}
