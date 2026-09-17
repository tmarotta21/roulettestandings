import { listHostedLeagues } from "@/lib/hosted";
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

async function touchMeta(
  displayWeek: number,
  season: string | null,
) {
  const prisma = getPrisma();
  await prisma.appMeta.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      lastSyncedAt: new Date(),
      nflWeek: displayWeek,
      nflSeason: season,
    },
    update: {
      lastSyncedAt: new Date(),
      nflWeek: displayWeek,
      nflSeason: season,
    },
  });
}

export async function syncAll(): Promise<{
  leagues: number;
  skipped: boolean;
  week: number | null;
  throughWeek: number;
}> {
  const hostedLeagues = await listHostedLeagues();
  const state = await getNflState();
  const displayWeek = nflDisplayWeek(state);
  const { throughWeek } = await completedNflWeek(displayWeek);

  if (!hasDatabase()) {
    return {
      leagues: hostedLeagues.length,
      skipped: true,
      week: displayWeek,
      throughWeek,
    };
  }

  const prisma = getPrisma();
  await touchMeta(displayWeek, state.season ?? null);

  for (const hosted of hostedLeagues) {
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
    leagues: hostedLeagues.length,
    skipped: false,
    week: displayWeek,
    throughWeek,
  };
}

/** Current-week Sleeper matchups only. */
export async function syncLiveScores(): Promise<{
  leagues: number;
  skipped: boolean;
  week: number | null;
}> {
  const hostedLeagues = await listHostedLeagues();
  if (!hasDatabase()) {
    return { leagues: hostedLeagues.length, skipped: true, week: null };
  }
  const prisma = getPrisma();
  const state = await getNflState();
  const week = nflDisplayWeek(state);
  const season = state.season ?? null;
  const dbLeagues = await prisma.league.findMany({ include: { teams: true } });
  if (dbLeagues.length === 0) {
    return { leagues: 0, skipped: true, week };
  }

  await Promise.all(
    dbLeagues.map(async (league) => {
      const playoffWeekStart = league.playoffWeekStart ?? 15;
      if (week < 1 || week >= playoffWeekStart) return;
      const matchups = await getMatchups(league.sleeperLeagueId, week).catch(() => []);
      const sides: MatchupSide[] = matchups.map((matchup) => ({
        rosterId: matchup.roster_id,
        points: liveMatchupPoints(matchup),
        matchupId: matchup.matchup_id ?? null,
      }));
      const results = computeRouletteWeek(sides);
      const teamByRoster = new Map(league.teams.map((team) => [team.sleeperRosterId, team]));
      await Promise.all(
        results.map((result) => {
          const team = teamByRoster.get(result.rosterId);
          if (!team) return null;
          const matchupId =
            sides.find((side) => side.rosterId === result.rosterId)?.matchupId ?? null;
          return prisma.weeklyScore.upsert({
            where: { teamId_week: { teamId: team.id, week } },
            create: {
              teamId: team.id,
              week,
              points: result.points,
              matchupId,
              won: result.won,
              tied: result.tied,
              roulette: result.roulette,
            },
            update: {
              points: result.points,
              matchupId,
              won: result.won,
              tied: result.tied,
              roulette: result.roulette,
            },
          });
        }),
      );
    }),
  );

  await touchMeta(week, season);
  return { leagues: dbLeagues.length, skipped: false, week };
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
  const hosted = await listHostedLeagues();
  const count = await getPrisma().generatedImage.count({
    where: { week, season },
  });
  return count >= hosted.length;
}

export { loadHostedStandings, loadLeagueStandings };
