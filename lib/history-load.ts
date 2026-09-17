import { unstable_cache } from "next/cache";
import { completedNflWeek } from "@/lib/nfl-final";
import type { HistorySeasonSnapshot } from "@/lib/history";
import {
  getLeagueUsers,
  getMatchups,
  getNflState,
  getRosters,
  getWinnersBracket,
  liveMatchupPoints,
  nflDisplayWeek,
  settingNumber,
  walkPreviousLeagues,
  type SleeperLeague,
  type SleeperMatchup,
} from "@/lib/sleeper";

const HISTORY_MAX_SEASONS = 20;
const HISTORY_REVALIDATE_SECONDS = 300;

function sidesFromMatchups(matchups: SleeperMatchup[]): HistorySeasonSnapshot["weeks"][number]["sides"] {
  return matchups.map((matchup) => ({
    rosterId: matchup.roster_id,
    points: liveMatchupPoints(matchup),
    matchupId: matchup.matchup_id ?? null,
  }));
}

function playoffWeekList(
  playoffWeekStart: number,
  throughWeek: number,
  pastSeason: boolean,
): number[] {
  const last = pastSeason
    ? playoffWeekStart + 3
    : Math.min(playoffWeekStart + 3, throughWeek);
  if (last < playoffWeekStart) return [];
  const weeks: number[] = [];
  for (let week = playoffWeekStart; week <= last; week += 1) weeks.push(week);
  return weeks;
}

async function snapshotForLeague(
  league: SleeperLeague,
  throughWeek: number,
  pastSeason: boolean,
): Promise<HistorySeasonSnapshot> {
  const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
  const playoffTeams = settingNumber(league.settings, "playoff_teams", 6);
  const lastRegular = Math.min(playoffWeekStart - 1, throughWeek);
  const regularWeeks =
    lastRegular >= 1 ? Array.from({ length: lastRegular }, (_, i) => i + 1) : [];
  const playoffWeeks = playoffWeekList(playoffWeekStart, throughWeek, pastSeason);

  const [users, rosters, bracket, ...matchupWeeks] = await Promise.all([
    getLeagueUsers(league.league_id),
    getRosters(league.league_id),
    getWinnersBracket(league.league_id),
    ...regularWeeks.map((week) => getMatchups(league.league_id, week)),
    ...playoffWeeks.map((week) => getMatchups(league.league_id, week)),
  ]);

  const regularMatchups = matchupWeeks.slice(0, regularWeeks.length);
  const playoffMatchups = matchupWeeks.slice(regularWeeks.length);

  const owners = rosters
    .filter((roster): roster is typeof roster & { owner_id: string } =>
      Boolean(roster.owner_id),
    )
    .map((roster) => {
      const user = users.find((row) => row.user_id === roster.owner_id);
      return {
        ownerId: roster.owner_id,
        rosterId: roster.roster_id,
        username: user?.display_name || user?.username || `Roster ${roster.roster_id}`,
      };
    });

  const weeks: HistorySeasonSnapshot["weeks"] = [];
  for (let i = 0; i < regularWeeks.length; i += 1) {
    const matchups = regularMatchups[i] ?? [];
    if (matchups.length === 0) continue;
    weeks.push({
      week: regularWeeks[i],
      playoff: false,
      sides: sidesFromMatchups(matchups),
    });
  }
  for (let i = 0; i < playoffWeeks.length; i += 1) {
    const matchups = playoffMatchups[i] ?? [];
    if (matchups.length === 0) continue;
    weeks.push({
      week: playoffWeeks[i],
      playoff: true,
      sides: sidesFromMatchups(matchups),
    });
  }

  return {
    season: league.season,
    leagueId: league.league_id,
    playoffTeams,
    owners,
    weeks,
    bracket,
  };
}

async function loadLeagueHistoryUncached(
  leagueId: string,
): Promise<HistorySeasonSnapshot[]> {
  const [chain, state] = await Promise.all([
    walkPreviousLeagues(leagueId, HISTORY_MAX_SEASONS),
    getNflState(),
  ]);
  const displayWeek = nflDisplayWeek(state);
  const prepared = await Promise.all(
    chain.map(async (league) => {
      const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
      const pastSeason =
        league.status === "complete" ||
        (state.season != null && league.season !== state.season);
      const live = pastSeason
        ? { throughWeek: playoffWeekStart + 3 }
        : await completedNflWeek(displayWeek);
      return { league, throughWeek: live.throughWeek, pastSeason };
    }),
  );
  return Promise.all(
    prepared.map(({ league, throughWeek, pastSeason }) =>
      snapshotForLeague(league, throughWeek, pastSeason),
    ),
  );
}

export const loadLeagueHistory = unstable_cache(
  loadLeagueHistoryUncached,
  ["league-history"],
  { revalidate: HISTORY_REVALIDATE_SECONDS },
);
