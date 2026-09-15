import { HOSTED_LEAGUES } from "@/lib/leagues";
import { completedNflWeek } from "@/lib/nfl-final";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import {
  computeRouletteWeek,
  regularSeasonWeeks,
  type MatchupSide,
} from "@/lib/roulette";
import { loadHostedStandings, loadLeagueStandings } from "@/lib/standings";
import {
  getLeague,
  getLeagueUsers,
  getMatchups,
  getNflState,
  getRosters,
  liveMatchupPoints,
  nflDisplayWeek,
  settingNumber,
} from "@/lib/sleeper";

export async function syncAll(): Promise<{
  leagues: number;
  skipped: boolean;
  week: number | null;
  throughWeek: number;
}> {
  const state = await getNflState();
  const displayWeek = nflDisplayWeek(state);
  const { throughWeek } = await completedNflWeek(displayWeek);

  if (!hasDatabase()) {
    return {
      leagues: HOSTED_LEAGUES.length,
      skipped: true,
      week: displayWeek,
      throughWeek,
    };
  }

  const prisma = getPrisma();
  await prisma.appMeta.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      lastSyncedAt: new Date(),
      nflWeek: displayWeek,
      nflSeason: state.season ?? null,
    },
    update: {
      lastSyncedAt: new Date(),
      nflWeek: displayWeek,
      nflSeason: state.season ?? null,
    },
  });

  for (const hosted of HOSTED_LEAGUES) {
    const [league, users, rosters] = await Promise.all([
      getLeague(hosted.sleeperLeagueId),
      getLeagueUsers(hosted.sleeperLeagueId),
      getRosters(hosted.sleeperLeagueId),
    ]);
    const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
    const playoffTeams = settingNumber(league.settings, "playoff_teams", 6);
    const dbLeague = await prisma.league.upsert({
      where: { sleeperLeagueId: hosted.sleeperLeagueId },
      create: {
        sleeperLeagueId: hosted.sleeperLeagueId,
        name: hosted.name,
        slug: hosted.slug,
        season: league.season,
        previousSleeperLeagueId: league.previous_league_id ?? null,
        playoffWeekStart,
        playoffTeams,
        totalRosters: league.total_rosters ?? rosters.length,
        lastSyncedAt: new Date(),
      },
      update: {
        name: hosted.name,
        slug: hosted.slug,
        season: league.season,
        previousSleeperLeagueId: league.previous_league_id ?? null,
        playoffWeekStart,
        playoffTeams,
        totalRosters: league.total_rosters ?? rosters.length,
        lastSyncedAt: new Date(),
      },
    });

    const userById = new Map(users.map((user) => [user.user_id, user]));
    for (const roster of rosters) {
      const owner = roster.owner_id ? userById.get(roster.owner_id) : undefined;
      await prisma.team.upsert({
        where: {
          leagueId_sleeperRosterId: {
            leagueId: dbLeague.id,
            sleeperRosterId: roster.roster_id,
          },
        },
        create: {
          leagueId: dbLeague.id,
          sleeperRosterId: roster.roster_id,
          ownerUserId: roster.owner_id ?? null,
          username: owner?.username ?? owner?.display_name ?? null,
          displayName: owner?.display_name ?? null,
          teamName: owner?.metadata?.team_name ?? null,
          avatar: owner?.avatar ?? null,
        },
        update: {
          ownerUserId: roster.owner_id ?? null,
          username: owner?.username ?? owner?.display_name ?? null,
          displayName: owner?.display_name ?? null,
          teamName: owner?.metadata?.team_name ?? null,
          avatar: owner?.avatar ?? null,
        },
      });
    }

    const weeks = regularSeasonWeeks(playoffWeekStart, throughWeek);
    const teams = await prisma.team.findMany({ where: { leagueId: dbLeague.id } });
    const teamByRoster = new Map(teams.map((team) => [team.sleeperRosterId, team]));

    for (const week of weeks) {
      const matchups = await getMatchups(hosted.sleeperLeagueId, week);
      const sides: MatchupSide[] = matchups.map((matchup) => ({
        rosterId: matchup.roster_id,
        points: liveMatchupPoints(matchup),
        matchupId: matchup.matchup_id ?? null,
      }));
      const results = computeRouletteWeek(sides);
      for (const result of results) {
        const team = teamByRoster.get(result.rosterId);
        if (!team) continue;
        await prisma.weeklyScore.upsert({
          where: { teamId_week: { teamId: team.id, week } },
          create: {
            teamId: team.id,
            week,
            points: result.points,
            matchupId: sides.find((side) => side.rosterId === result.rosterId)?.matchupId ?? null,
            won: result.won,
            tied: result.tied,
            roulette: result.roulette,
          },
          update: {
            points: result.points,
            matchupId: sides.find((side) => side.rosterId === result.rosterId)?.matchupId ?? null,
            won: result.won,
            tied: result.tied,
            roulette: result.roulette,
          },
        });
      }
    }
  }

  return {
    leagues: HOSTED_LEAGUES.length,
    skipped: false,
    week: displayWeek,
    throughWeek,
  };
}

export async function markGeneratedImages(week: number, season: string) {
  if (!hasDatabase()) return;
  const prisma = getPrisma();
  const boards = await loadHostedStandings();
  for (const board of boards) {
    const league = await prisma.league.findUnique({
      where: { sleeperLeagueId: board.sleeperLeagueId },
    });
    if (!league) continue;
    await prisma.generatedImage.upsert({
      where: {
        leagueId_season_week: {
          leagueId: league.id,
          season,
          week,
        },
      },
      create: { leagueId: league.id, season, week },
      update: {},
    });
  }
}

export async function imagesExistForWeek(week: number, season: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const count = await getPrisma().generatedImage.count({
    where: { week, season },
  });
  return count >= HOSTED_LEAGUES.length;
}

export { loadHostedStandings, loadLeagueStandings };
