import { listHostedLeagues } from "@/lib/hosted";
import { slugifyLeagueName } from "@/lib/leagues";
import { completedNflWeek } from "@/lib/nfl-final";
import {
  computeRouletteSeason,
  computeRouletteWeek,
  markPlayoffs,
  rankStandings,
  regularSeasonWeeks,
  weeklyStandingsPts,
  type MatchupSide,
} from "@/lib/roulette";
import { teamTint } from "@/lib/colors";
import {
  getLeague,
  getLeagueUsers,
  getMatchups,
  getNflState,
  getRosters,
  liveMatchupPoints,
  nflDisplayWeek,
  settingNumber,
  type SleeperLeagueUser,
  type SleeperMatchup,
} from "@/lib/sleeper";

export type StandingRow = {
  rosterId: number;
  username: string;
  wins: number;
  ties: number;
  rou: number;
  pts: number;
  last: number;
  pf: number;
  inPlayoffs: boolean;
  tint: string;
};

export type LeagueStandings = {
  sleeperLeagueId: string;
  name: string;
  slug: string;
  season: string;
  week: number;
  throughWeek: number;
  currentWeekFinal: boolean;
  playoffTeams: number;
  playoffWeekStart: number;
  totalRosters: number;
  rows: StandingRow[];
};

export function usernameForRoster(
  rosterId: number,
  ownerByRoster: Map<number, string>,
  users: SleeperLeagueUser[],
): string {
  const ownerId = ownerByRoster.get(rosterId);
  const user = users.find((row) => row.user_id === ownerId);
  return user?.display_name || user?.username || `Roster ${rosterId}`;
}

function sidesFromMatchups(matchups: SleeperMatchup[]): MatchupSide[] {
  return matchups.map((matchup) => ({
    rosterId: matchup.roster_id,
    points: liveMatchupPoints(matchup),
    matchupId: matchup.matchup_id ?? null,
  }));
}

export async function loadLeagueStandings(
  sleeperLeagueId: string,
): Promise<LeagueStandings> {
  const [league, users, state, rosters] = await Promise.all([
    getLeague(sleeperLeagueId),
    getLeagueUsers(sleeperLeagueId),
    getNflState(),
    getRosters(sleeperLeagueId),
  ]);
  const displayWeek = nflDisplayWeek(state);
  const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
  const playoffTeams = settingNumber(league.settings, "playoff_teams", 6);
  const pastSeason =
    league.status === "complete" ||
    (state.season != null && league.season !== state.season);
  const live = pastSeason
    ? { throughWeek: playoffWeekStart - 1, currentFinal: true }
    : await completedNflWeek(displayWeek);
  const throughWeek = live.throughWeek;
  const currentFinal = live.currentFinal;
  const weeks = regularSeasonWeeks(playoffWeekStart, throughWeek);

  const matchupWeeks = await Promise.all(
    weeks.map((week) => getMatchups(sleeperLeagueId, week)),
  );
  const seasonWeeks = matchupWeeks.map(sidesFromMatchups);
  const ranked = markPlayoffs(rankStandings(computeRouletteSeason(seasonWeeks)), playoffTeams);
  const lastWeek = seasonWeeks.at(-1);
  const lastByRoster = new Map(
    (lastWeek ? computeRouletteWeek(lastWeek) : []).map((result) => [
      result.rosterId,
      weeklyStandingsPts(result),
    ]),
  );

  const ownerByRoster = new Map<number, string>();
  for (const roster of rosters) {
    if (roster.owner_id) ownerByRoster.set(roster.roster_id, roster.owner_id);
  }

  const hosted = (await listHostedLeagues()).find(
    (row) => row.sleeperLeagueId === sleeperLeagueId,
  );
  return {
    sleeperLeagueId,
    name: hosted?.name ?? league.name,
    slug: hosted?.slug ?? slugifyLeagueName(league.name),
    season: league.season,
    week: displayWeek,
    throughWeek,
    currentWeekFinal: currentFinal,
    playoffTeams,
    playoffWeekStart,
    totalRosters: league.total_rosters ?? ranked.length,
    rows: ranked.map((row) => {
      const username = usernameForRoster(row.rosterId, ownerByRoster, users);
      return {
        rosterId: row.rosterId,
        username,
        wins: row.wins,
        ties: row.ties,
        rou: row.rou,
        pts: row.pts,
        last: lastByRoster.get(row.rosterId) ?? 0,
        pf: row.pf,
        inPlayoffs: row.inPlayoffs,
        tint: teamTint(username),
      };
    }),
  };
}

export async function loadHostedStandings(): Promise<LeagueStandings[]> {
  const hosted = await listHostedLeagues();
  return Promise.all(
    hosted.map((league) => loadLeagueStandings(league.sleeperLeagueId)),
  );
}
